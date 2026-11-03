/**
 * One end of a stream task's socket, as the caller holds it.
 *
 * The task's run response carries where to dial and a short-lived credential
 * (SocketAccess). The relay pairs this connection with the worker's. Until the
 * app's first frame arrives nobody may be on the other end yet (the worker can
 * still be pulling an image), so the session is `waiting`, not `live`.
 *
 * Frames follow the function's schemas (see ./schema): a binary frame is one
 * item of the binary live field, a text frame is a JSON object keyed by field
 * name.
 */
import type { SocketAccess } from '../types.js';
import type { TaskWatch as TasksWatch } from '../api/tasks.js';
import { CLEAR_KEY, ERROR_KEY, REDIAL_CODES, RELAY_KEY } from './protocol.js';
import { binaryLiveField, splitLiveSchema, type JsonSchema } from './schema.js';

export type LiveState = 'connecting' | 'waiting' | 'live' | 'ended';

export interface LiveEnd {
  /** The WebSocket close code, or 1006 when the session ended without one. */
  code: number;
  reason: string;
  /** The caller asked for it. */
  byCaller: boolean;
  /** The task ended before the app connected, so the session gave up waiting. */
  taskEnded: boolean;
}

export interface LiveHandlers {
  onState?: (state: LiveState, end?: LiveEnd) => void;
  /** An item of the output's binary live field. */
  onBinary?: (data: ArrayBuffer) => void;
  /** A partial output object keyed by field name. */
  onPatch?: (patch: Record<string, unknown>) => void;
  /**
   * Drop what you have buffered of this live output field: the app sends it
   * when an answer is cut short, e.g. the user talked over it. Without this
   * handler the control frame reaches onPatch as `{"$clear": field}`.
   */
  onClear?: (field: string) => void;
  /**
   * The app refused a frame, or has something to report, and goes on:
   * `{"$error": {field, message}}`. Apps on older SDKs (inferencesh before 0.10.1, @inferencesh/app before 0.1.16) send it
   * as `{"error": ...}`, which counts too unless the output has an `error`
   * field. Without this handler it stays in the patch.
   */
  onError?: (field: string | null, message: string) => void;
  /** A text frame that is not a JSON object: text the app sent as text. */
  onText?: (text: string) => void;
  /**
   * With `outputSchema`, each frame mapped to its output field: an item of a
   * live field (an ArrayBuffer for the binary one) or a new value of an
   * ordinary field. Takes the place of onBinary and onPatch where those are
   * not set.
   */
  onUpdate?: (update: LiveUpdate) => void;
}

/** One thing the app sent, mapped to its output field. */
export interface LiveUpdate {
  field: string;
  value: unknown;
}

/**
 * Follows the task the socket belongs to (what `client.tasks.watch` returns):
 * `done` settles when the task ends, rejected when it failed or was
 * cancelled; `stop` ends the watch early and leaves `done` pending. Only
 * settling matters here, so any promise will do.
 */
export type TaskWatch = Pick<TasksWatch, 'stop'> & { done: Promise<unknown> };

/** The part of the WebSocket API the session uses; browsers, Node 22+ and `ws` all provide it. */
export interface WebSocketLike {
  binaryType: string;
  readyState: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  send(data: string | ArrayBuffer | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  /** Bytes queued and not yet sent; browsers and `ws` have it. */
  readonly bufferedAmount?: number;
}

export type WebSocketConstructor = new (url: string) => WebSocketLike;

const WS_OPEN = 1;

export interface LiveSessionOptions {
  access: SocketAccess;
  handlers?: LiveHandlers;
  /** Issues a fresh credential (POST /sockets/{id}/access) for a redial. */
  renew?: () => Promise<SocketAccess>;
  /**
   * Ends the session when the task ends before the app connected. Without it
   * a task that fails before its worker dials leaves the caller waiting on
   * the relay until the pair timeout.
   */
  task?: TaskWatch;
  /** The WebSocket to dial with; defaults to the runtime's global one. */
  webSocket?: WebSocketConstructor;
  /** The function's input schema: `sendField` routes by it. */
  inputSchema?: JsonSchema | null;
  /** The function's output schema: frames arrive at onUpdate as fields. */
  outputSchema?: JsonSchema | null;
  /**
   * The binary frames sent are live media, a microphone: perishable, so late
   * is worse than lost. The session then holds them until the app can read
   * them (the relay says the socket paired, or the app's first frame
   * arrives), keeping only the newest few, and drops a frame rather than
   * queue it behind a full send buffer. Leave it off for binary data that
   * must all arrive (a file sent in chunks).
   */
  realtime?: boolean | RealtimeOptions;
}

export interface RealtimeOptions {
  /** Binary frames kept while the app cannot read yet, newest first (default 10: 200 ms of 20 ms frames). */
  holdFrames?: number;
  /** Bytes the WebSocket may have queued before a binary frame is dropped (default 8192: about 250 ms of 16 kHz audio). */
  maxBufferedAmount?: number;
  /**
   * How long to wait, once open, for the relay to say it will report pairing.
   * A relay that does not (an older one) is treated as today: frames go out
   * once the socket is open. Default 1500 ms.
   */
  signalTimeoutMs?: number;
}

const REALTIME_DEFAULTS: Required<RealtimeOptions> = { holdFrames: 10, maxBufferedAmount: 8192, signalTimeoutMs: 1500 };

const MAX_REDIALS = 5;

function globalWebSocket(): WebSocketConstructor {
  const ctor = (globalThis as { WebSocket?: WebSocketConstructor }).WebSocket;
  if (!ctor) {
    throw new Error('no WebSocket in this runtime: pass one (e.g. from the "ws" package) as webSocket');
  }
  return ctor;
}

/**
 * Where to dial. A browser cannot set headers on a WebSocket, so the
 * credential rides in the query, as the relay documents.
 */
export function accessUrl(access: Pick<SocketAccess, 'url' | 'token'>): string {
  const sep = access.url.includes('?') ? '&' : '?';
  return `${access.url}${sep}access_token=${encodeURIComponent(access.token)}`;
}

export class LiveSession {
  private ws: WebSocketLike | null = null;
  private current: LiveState = 'connecting';
  private closedByCaller = false;
  private redials = 0;
  private access: SocketAccess;
  private readonly handlers: LiveHandlers;
  private readonly renew: (() => Promise<SocketAccess>) | undefined;
  private readonly task: TaskWatch | undefined;
  private readonly WebSocket: WebSocketConstructor;
  private readonly mapped: boolean;
  private readonly outputBinary: string | undefined;
  private readonly outputFields: Set<string>;
  private readonly inputKnown: boolean;
  private readonly inputBinary: string | undefined;
  private resolveEnded!: (end: LiveEnd) => void;
  private readonly realtime: Required<RealtimeOptions> | null;
  /** Realtime: binary frames may go out now. Set per connection. */
  private released = false;
  private held: Array<ArrayBuffer | ArrayBufferView> = [];
  private signalTimer: ReturnType<typeof setTimeout> | null = null;
  private dropped = 0;

  /** Settles when the session has ended, however it ended. */
  readonly ended: Promise<LiveEnd>;

  constructor(options: LiveSessionOptions) {
    this.access = options.access;
    this.handlers = options.handlers ?? {};
    this.renew = options.renew;
    this.task = options.task;
    this.WebSocket = options.webSocket ?? globalWebSocket();
    this.mapped = !!options.outputSchema;
    this.outputBinary = binaryLiveField(splitLiveSchema(options.outputSchema).live)?.key;
    this.outputFields = new Set(Object.keys(options.outputSchema?.properties ?? {}));
    this.inputKnown = !!options.inputSchema;
    this.inputBinary = binaryLiveField(splitLiveSchema(options.inputSchema).live)?.key;
    this.realtime = options.realtime ? { ...REALTIME_DEFAULTS, ...(options.realtime === true ? {} : options.realtime) } : null;
    this.ended = new Promise<LiveEnd>((resolve) => {
      this.resolveEnded = resolve;
    });
  }

  get state(): LiveState {
    return this.current;
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WS_OPEN;
  }

  /** Realtime: binary frames dropped, as stale (held past holdFrames) or behind a full send buffer. */
  get droppedFrames(): number {
    return this.dropped;
  }

  /** Dials the relay. The session reports its progress through onState. */
  connect(): void {
    this.setState('connecting');
    this.watchTask();
    // Realtime: ask the relay to say when the app is there (see release).
    const ws = new this.WebSocket(accessUrl(this.access) + (this.realtime ? '&signals=paired' : ''));
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    this.released = false;
    this.clearSignalTimer();

    ws.onopen = () => {
      this.setState('waiting');
      const realtime = this.realtime;
      if (realtime) {
        // A relay that reports pairing says so first thing. One that says
        // nothing is an older relay: send as soon as open, as before.
        this.signalTimer = setTimeout(() => {
          this.signalTimer = null;
          this.release();
        }, realtime.signalTimeoutMs);
      }
    };
    ws.onmessage = (event) => {
      if (typeof event.data === 'string' && this.relaySignal(event.data)) return;
      this.release(); // the app is there: it reads what we send
      if (this.current !== 'live') {
        this.setState('live');
        this.task?.stop(); // the app is there; the task's fate now shows on the socket
      }
      if (typeof event.data === 'string') this.deliverText(event.data);
      else this.deliverBinary(event.data as ArrayBuffer);
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.released = false;
      this.clearSignalTimer();
      const waiting = this.current !== 'live';
      if (!this.closedByCaller && waiting && REDIAL_CODES.has(event.code) && this.redials < MAX_REDIALS) {
        this.redials += 1;
        void this.redial();
        return;
      }
      this.end({ code: event.code, reason: event.reason, byCaller: this.closedByCaller, taskEnded: false });
    };
  }

  /**
   * `{"$relay": "waiting" | "paired"}`, written by the relay itself to a
   * client that dialed with ?signals=paired. True when the frame was one.
   */
  private relaySignal(text: string): boolean {
    if (!text.startsWith(`{"${RELAY_KEY}"`)) return false;
    let signal: unknown;
    try {
      signal = (JSON.parse(text) as Record<string, unknown>)[RELAY_KEY];
    } catch {
      return false;
    }
    if (signal === 'waiting') this.clearSignalTimer(); // it will say when it pairs: hold until then
    else if (signal === 'paired') this.release();
    return true;
  }

  /** Realtime: the app can read now. Sends the newest held frames and stops holding. */
  private release(): void {
    if (this.released) return;
    this.released = true;
    this.clearSignalTimer();
    const held = this.held;
    this.held = [];
    for (const frame of held) this.sendBinary(frame);
  }

  private clearSignalTimer(): void {
    if (this.signalTimer) clearTimeout(this.signalTimer);
    this.signalTimer = null;
  }

  private deliverText(text: string): void {
    let patch: unknown;
    try {
      patch = JSON.parse(text);
    } catch {
      patch = undefined;
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      this.handlers.onText?.(text); // text the app sent as text
      return;
    }
    const record = patch as Record<string, unknown>;
    const arrivedEmpty = Object.keys(record).length === 0;
    const { onClear, onError } = this.handlers;
    if (onClear && typeof record[CLEAR_KEY] === 'string') {
      onClear(record[CLEAR_KEY] as string);
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete record[CLEAR_KEY];
    }
    if (onError) {
      const key = ERROR_KEY in record ? ERROR_KEY : this.legacyError(record) ? 'error' : undefined;
      if (key) {
        const err = record[key];
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete record[key];
        const { field = null, message } = (err && typeof err === 'object' ? err : { message: String(err) }) as { field?: string | null; message?: unknown };
        onError(field, typeof message === 'string' ? message : JSON.stringify(err));
      }
    }
    if (!arrivedEmpty && Object.keys(record).length === 0) return; // it was only control frames
    if (this.handlers.onPatch) this.handlers.onPatch(record);
    else if (this.mapped) for (const [field, value] of Object.entries(record)) this.handlers.onUpdate?.({ field, value });
  }

  /** `{"error": {"message": ...}}` from an app on an older SDK, unless the output has an `error` field. */
  private legacyError(record: Record<string, unknown>): boolean {
    const err = record.error as { message?: unknown } | undefined;
    return !!err && typeof err === 'object' && 'message' in err && !this.outputFields.has('error');
  }

  private deliverBinary(data: ArrayBuffer): void {
    if (this.handlers.onBinary) this.handlers.onBinary(data);
    else if (this.mapped && this.outputBinary) this.handlers.onUpdate?.({ field: this.outputBinary, value: data });
  }

  private watched = false;

  private watchTask(): void {
    if (!this.task || this.watched) return;
    this.watched = true;
    const endedBeforeLive = (reason: string) => {
      if (this.current === 'ended' || this.current === 'live') return;
      this.closeSocket(1000, 'task ended');
      this.end({ code: 1000, reason, byCaller: false, taskEnded: true });
    };
    this.task.done.then(
      () => endedBeforeLive('the task ended before the app connected'),
      (err: unknown) => endedBeforeLive(err instanceof Error ? err.message : String(err)),
    );
  }

  private async redial(): Promise<void> {
    try {
      if (this.renew) this.access = await this.renew();
      if (this.current !== 'ended' && !this.closedByCaller) this.connect();
    } catch (err) {
      this.end({ code: 1006, reason: err instanceof Error ? err.message : 'could not redial', byCaller: false, taskEnded: false });
    }
  }

  private setState(state: LiveState, end?: LiveEnd): void {
    this.current = state;
    this.handlers.onState?.(state, end);
  }

  private end(end: LiveEnd): void {
    if (this.current === 'ended') return;
    this.task?.stop();
    this.setState('ended', end);
    this.resolveEnded(end);
  }

  private closeSocket(code: number, reason: string): void {
    const ws = this.ws;
    this.ws = null; // its onclose must not end the session a second time
    ws?.close(code, reason);
  }

  /** One item of the input's binary live field. */
  sendBinary(data: ArrayBuffer | ArrayBufferView): void {
    const realtime = this.realtime;
    if (!realtime) {
      if (this.isOpen) this.ws!.send(data);
      return;
    }
    if (!this.released) {
      // The app cannot read yet: keep the newest few, so what it hears
      // first is what was just said, not what was said during its cold start.
      this.held.push(data);
      if (this.held.length > realtime.holdFrames) {
        this.held.shift();
        this.dropped += 1;
      }
      return;
    }
    if (!this.isOpen) return;
    if ((this.ws!.bufferedAmount ?? 0) > realtime.maxBufferedAmount) {
      this.dropped += 1; // the network is behind: this frame would arrive late
      return;
    }
    this.ws!.send(data);
  }

  /**
   * One item of an input live field, or a new value of an ordinary one: a
   * binary frame for the binary live field, a JSON frame otherwise. Needs
   * `inputSchema`.
   */
  sendField(field: string, value: unknown): void {
    if (!this.inputKnown) throw new Error("sendField needs the function's inputSchema");
    if (field === this.inputBinary) this.sendBinary(value as ArrayBuffer | ArrayBufferView);
    else this.sendPatch({ [field]: value });
  }

  /** A partial input object keyed by field name. */
  sendPatch(patch: Record<string, unknown>): void {
    if (this.isOpen) this.ws!.send(JSON.stringify(patch));
  }

  /** Ends the stream; the function returns and the task completes. */
  close(): void {
    this.closedByCaller = true;
    if (this.ws) {
      this.ws.close(1000, 'done'); // onclose ends the session
    } else {
      this.end({ code: 1000, reason: 'done', byCaller: true, taskEnded: false });
    }
  }
}
