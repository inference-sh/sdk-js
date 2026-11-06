/**
 * PollManager — polling transport alternative to StreamManager.
 *
 * Used when long-lived SSE connections are unavailable (Convex actions,
 * Cloudflare Workers, restricted edge runtimes).
 */

export interface PollManagerOptions<T> {
  /** Function that fetches the latest data each poll cycle */
  pollFunction: () => Promise<T>;
  /** Milliseconds between polls (default 2000) */
  intervalMs?: number;
  /** Maximum consecutive errors before giving up (default 5) */
  maxRetries?: number;
  /** Delay after an error before retrying (default 1000) */
  retryDelayMs?: number;
  /** Called with data on every successful poll */
  onData?: (data: T) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when polling starts */
  onStart?: () => void;
  /**
   * Called once when polling stops. `error` is the last poll error when the
   * manager gave up after `maxRetries` consecutive errors; it is undefined
   * when the caller stopped it.
   */
  onStop?: (error?: Error) => void;
}

export class PollManager<T> {
  private readonly pollFunction: () => Promise<T>;
  private readonly intervalMs: number;
  private readonly maxRetries: number;
  private readonly onData?: (data: T) => void;
  private readonly onError?: (error: Error) => void;
  private readonly onStart?: () => void;
  private readonly onStop?: (error?: Error) => void;
  private interval: ReturnType<typeof setInterval> | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;
  private isStopped = true;
  private polling = false;

  constructor(options: PollManagerOptions<T>) {
    this.pollFunction = options.pollFunction;
    this.intervalMs = options.intervalMs ?? 2000;
    this.maxRetries = options.maxRetries ?? 5;
    this.onData = options.onData;
    this.onError = options.onError;
    this.onStart = options.onStart;
    this.onStop = options.onStop;
  }

  /** Start polling. First poll is immediate, then at intervalMs. */
  start(): void {
    if (!this.isStopped) return;
    this.isStopped = false;
    this.consecutiveErrors = 0;
    this.onStart?.();
    this.poll(); // immediate first poll
    this.interval = setInterval(() => this.poll(), this.intervalMs);
  }

  /** Stop polling and clean up. */
  stop(): void {
    this.halt();
  }

  private halt(error?: Error): void {
    if (this.isStopped) return;
    this.isStopped = true;
    this.cleanup();
    this.onStop?.(error);
  }

  private cleanup(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private async poll(): Promise<void> {
    if (this.isStopped || this.polling) return;
    this.polling = true;
    try {
      const data = await this.pollFunction();
      this.polling = false;
      if (this.isStopped) return;
      this.consecutiveErrors = 0;
      this.onData?.(data);
    } catch (err) {
      this.polling = false;
      if (this.isStopped) return;
      const error = err instanceof Error ? err : new Error(String(err));
      this.consecutiveErrors++;
      this.onError?.(error);

      if (this.consecutiveErrors >= this.maxRetries) {
        this.halt(error);
      }
    }
  }
}
