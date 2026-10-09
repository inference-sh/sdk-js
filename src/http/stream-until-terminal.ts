/**
 * Follow a resource's NDJSON stream until the resource reaches a terminal
 * state.
 *
 * StreamableManager never reconnects, and a stream can close cleanly before
 * the resource is done (load balancer idle timeout, API deploy). A wait built
 * on it must not hang then. This helper owns that contract for every
 * "stream until done" wait: when the stream ends early it fetches the
 * resource once (`reconcile`) and settles with what that shows, or rejects
 * when the resource is still not terminal. sdk-py's `wait_for_completion`
 * does the same final GET.
 */

import { StreamableManager, type StreamableManagerOptions, type StreamRequest } from './streamable';

/** Settles a stream-until-terminal wait. Calls after the first are ignored. */
export interface TerminalSettler<R> {
  resolve(value: R): void;
  reject(error: Error): void;
}

/** The stream to follow and how to tell when its resource is done. */
export type StreamUntilTerminalSpec<T> = Pick<StreamableManagerOptions<T>, 'body' | 'onData' | 'onPartialData' | 'onStart' | 'onDelta'> & {
  /** Sends the stream request, e.g. `(init) => http.fetch(endpoint, init)`. */
  request: StreamRequest;
  /** Typed event listeners ({"event": name, "data": ...} messages). */
  events?: Record<string, (data: any, fields?: string[]) => void>;
  /**
   * Called once when the stream ends cleanly before the wait settled. Fetch
   * the resource and settle if it is terminal; returning without settling
   * rejects the wait with `closedMessage`.
   */
  reconcile: () => Promise<void>;
  /** Rejection message when the stream closed and the resource is still not terminal. */
  closedMessage: string;
  /**
   * Called when the wait ends because `stop()` was called. Without it `done`
   * stays pending.
   */
  onStopped?: () => void;
  /**
   * Keep the stream open after the wait settled so its listeners go on
   * seeing updates (default false: settling stops the stream).
   */
  keepOpen?: boolean;
};

export interface StreamUntilTerminal<R> {
  /** Settles when the resource is terminal, the stream fails, or it closed early and the resource is not terminal. */
  done: Promise<R>;
  /** Ends the stream on purpose; see `onStopped`. */
  stop(): void;
}

/**
 * `build` receives the settler and returns the stream spec; its handlers call
 * `settle.resolve`/`settle.reject` once the resource is terminal. Settling
 * stops the stream unless the spec says `keepOpen`.
 */
export function streamUntilTerminal<T, R>(
  build: (settle: TerminalSettler<R>) => StreamUntilTerminalSpec<T>,
): StreamUntilTerminal<R> {
  let settled = false;
  let stopped = false;
  let manager!: StreamableManager<T>;

  const done = new Promise<R>((resolve, reject) => {
    const settle: TerminalSettler<R> = {
      resolve: (value) => {
        if (settled) return;
        settled = true;
        if (!keepOpen) manager?.stop();
        resolve(value);
      },
      reject: (error) => {
        if (settled) return;
        settled = true;
        if (!keepOpen) manager?.stop();
        reject(error);
      },
    };

    const { events, reconcile, closedMessage, onStopped, keepOpen, ...managerOptions } = build(settle);
    let streamError: Error | null = null;

    manager = new StreamableManager<T>({
      ...managerOptions,
      onError: (error) => {
        streamError = error;
      },
      onEnd: () => {
        if (settled) return;
        if (stopped) {
          onStopped?.();
          return;
        }
        if (streamError) {
          settle.reject(streamError);
          return;
        }
        // Closed cleanly before the resource was terminal: ask the API once.
        const closed = (cause?: unknown) => {
          if (stopped && !settled) {
            onStopped?.();
            return;
          }
          const error = new Error(closedMessage);
          if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause;
          settle.reject(error);
        };
        reconcile().then(() => closed(), closed);
      },
    });
    for (const [name, listener] of Object.entries(events ?? {})) {
      manager.addEventListener(name, listener);
    }
  });

  manager.start();

  return {
    done,
    stop: () => {
      if (stopped) return;
      stopped = true;
      manager.stop();
    },
  };
}
