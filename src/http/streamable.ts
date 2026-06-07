/**
 * Streamable HTTP client using fetch + ReadableStream.
 * This is the NDJSON alternative to SSE/EventSource that avoids
 * the browser's ~6 connection limit per domain.
 */

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

/**
 * Stream NDJSON from an HTTP endpoint using fetch + ReadableStream.
 * Yields parsed JSON objects, automatically filtering heartbeats.
 */
export async function* streamable<T = unknown>(
  url: string,
  options: StreamableOptions = {}
): AsyncGenerator<T> {
  const {
    headers = {},
    body,
    method = body ? 'POST' : 'GET',
    signal,
    skipHeartbeats = true,
  } = options;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/x-ndjson',
    ...headers,
  };

  if (body) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  if (!res.body) {
    throw new Error('No response body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.trim()) continue;

        const parsed = JSON.parse(line) as StreamableMessage<T>;

        // Skip heartbeats
        if (skipHeartbeats && parsed.type === 'heartbeat') {
          continue;
        }

        // If it's a wrapped message with event/data/fields, yield the data
        // Otherwise yield the entire parsed object
        if ('data' in parsed && parsed.data !== undefined) {
          yield parsed.data;
        } else {
          yield parsed as T;
        }
      }
    }

    // Handle remaining buffer
    if (buffer.trim()) {
      const parsed = JSON.parse(buffer) as StreamableMessage<T>;
      if (!(skipHeartbeats && parsed.type === 'heartbeat')) {
        if ('data' in parsed && parsed.data !== undefined) {
          yield parsed.data;
        } else {
          yield parsed as T;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * StreamableManager provides a callback-based API similar to StreamManager
 * but uses fetch + ReadableStream instead of EventSource.
 */
export interface StreamableManagerOptions<T> {
  /** URL to connect to */
  url: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Called for each message */
  onData?: (data: T) => void;
  /** Called for partial updates with fields list */
  onPartialData?: (data: T, fields: string[]) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Called when stream starts */
  onStart?: () => void;
  /** Called when stream ends */
  onEnd?: () => void;
}

export class StreamableManager<T> {
  private options: StreamableManagerOptions<T>;
  private abortController: AbortController | null = null;
  private isRunning = false;
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(options: StreamableManagerOptions<T>) {
    this.options = options;
  }

  /**
   * Add a listener for typed events (e.g., 'chats', 'chat_messages').
   * Used when server sends events with {"event": "eventName", "data": ...} format.
   */
  addEventListener<E = unknown>(eventName: string, callback: (data: E) => void): () => void {
    const listeners = this.eventListeners.get(eventName) || new Set();
    listeners.add(callback as (data: unknown) => void);
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
    this.abortController = new AbortController();

    try {
      this.options.onStart?.();

      for await (const message of streamableRaw<T>(this.options.url, {
        headers: this.options.headers,
        body: this.options.body,
        signal: this.abortController.signal,
      })) {
        if (!this.isRunning) break;

        const wrapper = message as StreamableMessage<T>;

        // Handle typed events ({"event": "...", "data": ...})
        if (wrapper.event && this.eventListeners.has(wrapper.event)) {
          const listeners = this.eventListeners.get(wrapper.event)!;
          const eventData = wrapper.data !== undefined ? wrapper.data : message;
          listeners.forEach(callback => callback(eventData));
          continue;
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
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Intentional stop, not an error
      } else {
        this.options.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      this.isRunning = false;
      this.options.onEnd?.();
    }
  }

  stop(): void {
    this.isRunning = false;
    this.abortController?.abort();
    this.abortController = null;
  }
}

/**
 * Raw streamable that yields the full message including wrapper.
 * Use this when you need access to event type or fields.
 */
export async function* streamableRaw<T = unknown>(
  url: string,
  options: StreamableOptions = {}
): AsyncGenerator<StreamableMessage<T> | T> {
  const {
    headers = {},
    body,
    method = body ? 'POST' : 'GET',
    signal,
    skipHeartbeats = true,
  } = options;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/x-ndjson',
    ...headers,
  };

  if (body) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  if (!res.body) {
    throw new Error('No response body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.trim()) continue;

        const parsed = JSON.parse(line);

        // Skip heartbeats
        if (skipHeartbeats && parsed.type === 'heartbeat') {
          continue;
        }

        yield parsed;
      }
    }

    // Handle remaining buffer
    if (buffer.trim()) {
      const parsed = JSON.parse(buffer);
      if (!(skipHeartbeats && parsed.type === 'heartbeat')) {
        yield parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
