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
import type { SocketAccess } from '../types';

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
}

/**
 * Follows the task the socket belongs to. `done` settles when the task ends
 * (rejected when it failed or was cancelled); `stop` ends the watch early and
 * leaves `done` pending.
 */
export interface TaskWatch {
  done: Promise<unknown>;
  stop(): void;
}

/** The part of the WebSocket API the session uses; browsers, Node 22+ and `ws` all provide it. */
export interface WebSocketLike {
  binaryType: string;
  readyState: number;
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number; reason: string }) => void) | null;
  send(data: string | ArrayBuffer | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
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
}

// 1012: the relay is restarting and closed an end that still waited for its
// peer. 1013: the peer did not come in time. Both mean "dial again" while the
// task is alive, and neither means anything once frames have flowed.
const REDIAL_CODES = new Set([1012, 1013]);
const MAX_REDIALS = 5;

function globalWebSocket(): WebSocketConstructor {
  const ctor = (globalThis as { WebSocket?: WebSocketConstructor }).WebSocket;
  if (!ctor) {
    throw new Error('no WebSocket in this runtime: pass one (e.g. from the "ws" package) as webSocket');
  }
  return ctor;
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
  private resolveEnded!: (end: LiveEnd) => void;

  /** Settles when the session has ended, however it ended. */
  readonly ended: Promise<LiveEnd>;

  constructor(options: LiveSessionOptions) {
    this.access = options.access;
    this.handlers = options.handlers ?? {};
    this.renew = options.renew;
    this.task = options.task;
    this.WebSocket = options.webSocket ?? globalWebSocket();
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

  /** Dials the relay. The session reports its progress through onState. */
  connect(): void {
    this.setState('connecting');
    this.watchTask();
    // A browser cannot set headers on a WebSocket, so the credential rides in
    // the query, as the relay documents.
    const ws = new this.WebSocket(`${this.access.url}?access_token=${encodeURIComponent(this.access.token)}`);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => this.setState('waiting');
    ws.onmessage = (event) => {
      if (this.current !== 'live') {
        this.setState('live');
        this.task?.stop(); // the app is there; the task's fate now shows on the socket
      }
      if (typeof event.data === 'string') {
        let patch: unknown;
        try {
          patch = JSON.parse(event.data);
        } catch {
          patch = { text: event.data };
        }
        if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
          this.handlers.onPatch?.(patch as Record<string, unknown>);
        }
      } else {
        this.handlers.onBinary?.(event.data as ArrayBuffer);
      }
    };
    ws.onclose = (event) => {
      if (this.ws !== ws) return;
      this.ws = null;
      const waiting = this.current !== 'live';
      if (!this.closedByCaller && waiting && REDIAL_CODES.has(event.code) && this.redials < MAX_REDIALS) {
        this.redials += 1;
        void this.redial();
        return;
      }
      this.end({ code: event.code, reason: event.reason, byCaller: this.closedByCaller, taskEnded: false });
    };
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
    if (this.isOpen) this.ws!.send(data);
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
