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
  /** Called when polling stops (intentionally or after max retries) */
  onStop?: () => void;
}

export class PollManager<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private options: any;
  private interval: ReturnType<typeof setInterval> | null = null;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;
  private isStopped = true;
  private polling = false;

  constructor(options: PollManagerOptions<T>) {
    this.options = {
      intervalMs: 2000,
      maxRetries: 5,
      retryDelayMs: 1000,
      ...options,
    };
  }

  /** Start polling. First poll is immediate, then at intervalMs. */
  start(): void {
    if (!this.isStopped) return;
    this.isStopped = false;
    this.consecutiveErrors = 0;
    this.options.onStart?.();
    this.poll(); // immediate first poll
    this.interval = setInterval(() => this.poll(), this.options.intervalMs);
  }

  /** Stop polling and clean up. */
  stop(): void {
    if (this.isStopped) return;
    this.isStopped = true;
    this.cleanup();
    this.options.onStop?.();
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
      const data = await this.options.pollFunction();
      this.polling = false;
      if (this.isStopped) return;
      this.consecutiveErrors = 0;
      this.options.onData?.(data);
    } catch (err) {
      this.polling = false;
      if (this.isStopped) return;
      const error = err instanceof Error ? err : new Error(String(err));
      this.consecutiveErrors++;
      this.options.onError?.(error);

      if (this.consecutiveErrors >= this.options.maxRetries) {
        this.stop();
      }
    }
  }
}
