/**
 * Streamable HTTP client using fetch + ReadableStream.
 * This is the NDJSON alternative to SSE/EventSource that avoids
 * the browser's ~6 connection limit per domain.
 */

import type { DeltaEvent } from '../types.js';

/** What a stream asks of whatever sends its request. */
export interface StreamRequestInit {
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

/**
 * Sends a stream's request in place of a plain fetch of a URL. With
 * `(init) => http.fetch(endpoint, init)` the request carries the client's
 * auth and a refusal goes through its error handler.
 */
export type StreamRequest = (init: StreamRequestInit) => Promise<Response>;

export interface StreamableOptions {
  /** Additional headers to include */
  headers?: Record<string, string>;
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** HTTP method (defaults to GET, or POST if body is provided) */
  method?: 'GET' | 'POST';
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Skip heartbeat messages (default: true) */
  skipHeartbeats?: boolean;
  /** Request credentials mode (for cookie-based auth); a StreamRequest brings its own */
  credentials?: RequestCredentials;
}

export interface StreamableMessage<T = unknown> {
  /** Optional event type */
  event?: string;
  /** Data payload */
  data?: T;
  /** Updated fields (for partial updates) */
  fields?: string[];
  /** Message type (e.g., "heartbeat") */
  type?: string;
}

/** Send the stream's request and hand back the body to read. */
async function openStream(
  source: string | StreamRequest,
  { headers = {}, body, method = body ? 'POST' : 'GET', signal, credentials }: StreamableOptions
): Promise<ReadableStream<Uint8Array>> {
  const requestHeaders: Record<string, string> = {
    Accept: 'application/x-ndjson',
    ...headers,
  };

  if (body) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const init: StreamRequestInit = {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  };
  const res = typeof source === 'string' ? await fetch(source, { ...init, credentials }) : await source(init);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  if (!res.body) {
    throw new Error('No response body');
  }

  return res.body;
}

/** The error a stream read sees when its signal aborts. */
function abortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

/**
 * Resolves with `promise`, or rejects with an AbortError once `signal`
 * aborts. A request or body that ignores the signal cannot hold the caller.
 */
function untilAborted<P>(promise: Promise<P>, signal?: AbortSignal): Promise<P> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<P>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

/** Run a cleanup that may throw or reject; its failure changes nothing. */
function quietly(cleanup: () => Promise<unknown> | undefined): void {
  try {
    cleanup()?.catch(() => {});
  } catch {
    // Already closed.
  }
}

/** Every parsed NDJSON line of `body`, heartbeats included. Aborting `signal` ends the read with an AbortError. */
async function* readLines(body: ReadableStream<Uint8Array>, signal?: AbortSignal): AsyncGenerator<any> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const cancel = () => quietly(() => reader.cancel?.());
  signal?.addEventListener('abort', cancel, { once: true });

  try {
    while (true) {
      const { done, value } = await untilAborted(reader.read(), signal);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.trim()) continue;
        yield JSON.parse(line);
      }
    }

    // Handle remaining buffer
    if (buffer.trim()) {
      yield JSON.parse(buffer);
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    try {
      reader.releaseLock();
    } catch {
      // A read still pending after an abort can make releaseLock throw.
    }
  }
}

const isHeartbeat = (parsed: unknown) =>
  typeof parsed === 'object' && parsed !== null && (parsed as StreamableMessage).type === 'heartbeat';

/**
 * Stream NDJSON from an HTTP endpoint using fetch + ReadableStream.
 * Yields parsed JSON objects, automatically filtering heartbeats.
 * `source` is the URL to fetch, or a StreamRequest that sends the request.
 */
export async function* streamable<T = unknown>(
  source: string | StreamRequest,
  options: StreamableOptions = {}
): AsyncGenerator<T> {
  for await (const parsed of streamableRaw<T>(source, options)) {
    const message = parsed as StreamableMessage<T>;
    // If it's a wrapped message with event/data/fields, yield the data
    // Otherwise yield the entire parsed object
    if (typeof message === 'object' && message !== null && 'data' in message && message.data !== undefined) {
      yield message.data;
    } else {
      yield parsed as T;
    }
  }
}

/**
 * Raw streamable that yields the full message including wrapper.
 * Use this when you need access to event type or fields.
 */
export async function* streamableRaw<T = unknown>(
  source: string | StreamRequest,
  options: StreamableOptions = {}
): AsyncGenerator<StreamableMessage<T> | T> {
  const { skipHeartbeats = true } = options;
  for await (const parsed of readLines(await openStream(source, options), options.signal)) {
    if (skipHeartbeats && isHeartbeat(parsed)) continue;
    yield parsed;
  }
}

/** How a StreamableManager reconnects after its stream fails. */
export interface StreamReconnectOptions {
  /**
   * Failed connection attempts in a row before the manager gives up and calls
   * `onError` (default 10). Any line received, heartbeats included, resets the count.
   */
  maxAttempts?: number;
  /** Delay before the first retry in ms (default 1000). It doubles per attempt, with jitter. */
  baseDelayMs?: number;
  /** Longest delay between retries in ms (default 30000). */
  maxDelayMs?: number;
  /**
   * Reconnect when nothing, not even a heartbeat, arrives for this many ms
   * (default 30000; the API sends a heartbeat every 10s). 0 turns it off.
   */
  idleTimeoutMs?: number;
}

const RECONNECT_DEFAULTS: Required<StreamReconnectOptions> = {
  maxAttempts: 10,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  idleTimeoutMs: 30_000,
};

/** The HTTP status an error carries, if any. */
function errorStatus(error: Error): number | undefined {
  const { statusCode, status } = error as Error & { statusCode?: unknown; status?: unknown };
  if (typeof statusCode === 'number') return statusCode;
  if (typeof status === 'number') return status;
  const match = /^HTTP (\d{3})\b/.exec(error.message);
  return match ? Number(match[1]) : undefined;
}

/** A refusal that a retry would get again: any 4xx except 408 (timeout) and 429 (rate limit). */
function isRetryable(error: Error): boolean {
  const status = errorStatus(error);
  if (status === undefined) return true;
  return !(status >= 400 && status < 500 && status !== 408 && status !== 429);
}

/** Exponential backoff for retry `attempt` (1-based), jittered to [50%, 100%] of the step. */
function backoffDelay(policy: Required<StreamReconnectOptions>, attempt: number): number {
  const step = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** (attempt - 1));
  return Math.round(step / 2 + Math.random() * (step / 2));
}

/**
 * StreamableManager provides a callback-based API similar to StreamManager
 * but uses fetch + ReadableStream instead of EventSource.
 */
/** Where a StreamableManager's stream comes from: a URL it fetches, or a StreamRequest. */
export type StreamableSource =
  | {
      /** URL to connect to */
      url: string;
      /** Additional headers */
      headers?: Record<string, string>;
      /** Request credentials mode (for cookie-based auth) */
      credentials?: RequestCredentials;
    }
  | {
      /** Sends the request, e.g. `(init) => http.fetch(endpoint, init)` */
      request: StreamRequest;
    };

export type StreamableManagerOptions<T> = StreamableSource & {
  /** Request body */
  body?: unknown;
  /** Called for each message */
  onData?: (data: T) => void;
  /** Called for partial updates with fields list */
  onPartialData?: (data: T, fields: string[]) => void;
  /**
   * Called when the stream fails. With `reconnect`, only once the manager
   * gives up: a refusal no retry would change (4xx other than 408/429), or
   * `maxAttempts` failures in a row.
   */
  onError?: (error: Error) => void;
  /** Called when stream starts */
  onStart?: () => void;
  /**
   * Called once when the manager is done: the stream ended cleanly, stop()
   * was called, or it failed and will not retry.
   */
  onEnd?: () => void;
  /** Called for delta events (streaming token deltas) */
  onDelta?: (delta: Record<string, any>, seq: number) => void;
  /**
   * Reconnect after the stream fails or goes silent (default false: a failure
   * ends the stream). `true` uses the StreamReconnectOptions defaults. A clean
   * end of the stream is not retried.
   */
  reconnect?: boolean | StreamReconnectOptions;
  /** With `reconnect`: the stream failed and the manager retries after `delayMs`. */
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
  /**
   * With `reconnect`: a retry got a new connection. Events sent while the
   * stream was down are lost, so this is where the caller fetches the current
   * state. The manager reads the new stream only after the returned promise
   * settles, so what it reads is newer than what the caller fetched; a
   * rejection counts as a failed attempt.
   */
  onReconnect?: (attempt: number) => void | Promise<void>;
};

export class StreamableManager<T> {
  private options: StreamableManagerOptions<T>;
  private abortController: AbortController | null = null;
  private isRunning = false;
  /** Bumped by start() and stop(), so a stopped run never acts again. */
  private runId = 0;
  /** Ends a pending retry wait early (stop, online, tab visible). */
  private wakeRetry: (() => void) | null = null;
  private eventListeners: Map<string, Set<(data: unknown, fields?: string[]) => void>> = new Map();

  constructor(options: StreamableManagerOptions<T>) {
    this.options = options;
  }

  /**
   * Add a listener for typed events (e.g., 'chats', 'chat_messages').
   * Used when server sends events with {"event": "eventName", "data": ...} format.
   */
  addEventListener<E = unknown>(eventName: string, callback: (data: E, fields?: string[]) => void): () => void {
    const listeners = this.eventListeners.get(eventName) || new Set();
    listeners.add(callback as (data: unknown, fields?: string[]) => void);
    this.eventListeners.set(eventName, listeners);

    // Return cleanup function
    return () => {
      const listeners = this.eventListeners.get(eventName);
      if (listeners) {
        listeners.delete(callback as (data: unknown) => void);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventName);
        }
      }
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    const run = ++this.runId;
    const active = () => this.runId === run;
    const { reconnect } = this.options;
    const policy = reconnect
      ? { ...RECONNECT_DEFAULTS, ...(reconnect === true ? {} : reconnect) }
      : null;
    // Failed attempts in a row; any line received resets it.
    let failures = 0;
    let attempts = 0;

    try {
      this.options.onStart?.();

      while (active()) {
        const retry = attempts++ > 0 ? failures : 0;
        const idle = { timedOut: false };
        let error: Error | null = null;
        try {
          await this.connect(active, policy?.idleTimeoutMs ?? 0, idle, retry, () => {
            failures = 0;
          });
        } catch (err) {
          error = err instanceof Error ? err : new Error(String(err));
        }

        if (!active()) break;
        if (idle.timedOut) {
          error = new Error(`Stream received nothing for ${policy!.idleTimeoutMs}ms`);
        }
        if (!error) break; // ended cleanly
        if (!policy) {
          if (error.name !== 'AbortError') this.options.onError?.(error);
          break;
        }
        if (!isRetryable(error) || failures >= policy.maxAttempts) {
          this.options.onError?.(error);
          break;
        }

        failures++;
        const delay = backoffDelay(policy, failures);
        this.options.onRetry?.(error, failures, delay);
        await this.waitToRetry(delay);
      }
    } catch (err) {
      // A callback threw outside a connection.
      if (active()) this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (active()) {
        this.isRunning = false;
        this.abortController = null;
      }
      this.options.onEnd?.();
    }
  }

  /**
   * One connection: open the stream and dispatch its messages until it ends.
   * Resolves on a clean end, throws when the request or the read fails.
   */
  private async connect(
    active: () => boolean,
    idleTimeoutMs: number,
    idle: { timedOut: boolean },
    retry: number,
    onActivity: () => void,
  ): Promise<void> {
    const controller = new AbortController();
    this.abortController = controller;
    const { signal } = controller;

    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const disarm = () => {
      if (watchdog !== undefined) clearTimeout(watchdog);
      watchdog = undefined;
    };
    const arm = () => {
      if (idleTimeoutMs <= 0) return;
      disarm();
      watchdog = setTimeout(() => {
        idle.timedOut = true;
        controller.abort();
      }, idleTimeoutMs);
    };

    try {
      arm();
      const { options } = this;
      const body = await untilAborted(
        'request' in options
          ? openStream(options.request, { body: options.body, signal })
          : openStream(options.url, {
              headers: options.headers,
              body: options.body,
              signal,
              credentials: options.credentials,
            }),
        signal,
      );

      if (retry > 0 && this.options.onReconnect) {
        disarm();
        try {
          await this.options.onReconnect(retry);
        } catch (err) {
          quietly(() => body.cancel?.());
          throw err;
        }
        if (!active()) {
          quietly(() => body.cancel?.());
          return;
        }
        arm();
      }

      for await (const message of readLines(body, signal)) {
        if (!active()) break;
        arm();
        onActivity();
        if (isHeartbeat(message)) continue;
        this.dispatch(message);
      }
    } finally {
      disarm();
    }
  }

  /** Route one message to onDelta, a typed event listener, onPartialData or onData. */
  private dispatch(message: unknown): void {
    const wrapper = message as StreamableMessage<T>;

    // Handle delta events
    if (wrapper.event === 'delta' && this.options.onDelta) {
      const payload = wrapper.data as unknown as DeltaEvent;
      if (payload && payload.delta) {
        this.options.onDelta(payload.delta, payload.seq);
      }
      return;
    }

    // Handle typed events ({"event": "...", "data": ...})
    if (wrapper.event && this.eventListeners.has(wrapper.event)) {
      const listeners = this.eventListeners.get(wrapper.event)!;
      const eventData = wrapper.data !== undefined ? wrapper.data : message;
      const fields = wrapper.fields;
      listeners.forEach(callback => callback(eventData, fields));
      return;
    }

    // Check if it's a partial update
    if (
      typeof message === 'object' &&
      message !== null &&
      'data' in message &&
      'fields' in message &&
      Array.isArray(wrapper.fields)
    ) {
      if (this.options.onPartialData && wrapper.data !== undefined) {
        this.options.onPartialData(wrapper.data, wrapper.fields!);
      } else if (wrapper.data !== undefined) {
        this.options.onData?.(wrapper.data);
      }
    } else if (wrapper.data !== undefined) {
      // Has data wrapper but no fields - unwrap
      this.options.onData?.(wrapper.data);
    } else {
      this.options.onData?.(message as T);
    }
  }

  /**
   * Wait `delayMs` before the next attempt. In a browser, coming back online
   * or the tab becoming visible retries at once; stop() ends the wait.
   */
  private waitToRetry(delayMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const win = typeof window !== 'undefined' && typeof window.addEventListener === 'function' ? window : undefined;
      const doc = typeof document !== 'undefined' && typeof document.addEventListener === 'function' ? document : undefined;

      const onVisible = () => {
        if (doc?.visibilityState === 'visible') wake();
      };
      const wake = () => {
        clearTimeout(timer);
        win?.removeEventListener('online', wake);
        doc?.removeEventListener('visibilitychange', onVisible);
        if (this.wakeRetry === wake) this.wakeRetry = null;
        resolve();
      };
      const timer = setTimeout(wake, delayMs);
      win?.addEventListener('online', wake);
      doc?.addEventListener('visibilitychange', onVisible);
      this.wakeRetry = wake;
    });
  }

  stop(): void {
    this.isRunning = false;
    this.runId++;
    this.abortController?.abort();
    this.abortController = null;
    this.wakeRetry?.();
  }
}
