export interface StreamManagerOptions<T> {
  createEventSource: () => Promise<EventSource | null>;
  autoReconnect?: boolean;
  maxReconnects?: number;
  reconnectDelayMs?: number;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStop?: () => void;
  onData?: (data: T) => void;
  onYield?: (data: T) => void;  // New callback for async iteration
}

export class StreamManager<T> {
  private options: StreamManagerOptions<T>;
  private eventSource: EventSource | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialConnectionAttempts = 0;
  private isConnected = false;
  private isStopped = false;

  constructor(options: StreamManagerOptions<T>) {
    this.options = {
      autoReconnect: true,
      maxReconnects: 5,
      reconnectDelayMs: 1000,
      ...options,
    };
  }

  private clearTimeouts() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  private closeEventSource() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private cleanup() {
    this.clearTimeouts();
    this.closeEventSource();
    this.isConnected = false;
    this.options.onStop?.();
  }

  stopAfter(delayMs: number) {
    this.clearTimeouts();
    this.stopTimeout = setTimeout(() => this.stop(), delayMs);
  }

  clearStopTimeout() {
    if (this.stopTimeout) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
  }

  stop() {
    this.isStopped = true;
    this.cleanup();
  }

  private scheduleReconnect() {
    if (!this.options.autoReconnect || this.isStopped) return false;

    // If we had a successful connection before, always reconnect
    // Otherwise, check if we've exceeded initial connection attempts
    if (!this.isConnected && this.initialConnectionAttempts >= (this.options.maxReconnects ?? 5)) {
      return false;
    }

    this.reconnectTimeout = setTimeout(() => {
      if (!this.isStopped) {
        if (!this.isConnected) {
          this.initialConnectionAttempts++;
        }
        this.connect();
      }
    }, this.options.reconnectDelayMs);

    return true;
  }

  async connect() {
    if (this.isStopped) return;

    this.cleanup();
    this.isStopped = false;

    try {
      const source = await this.options.createEventSource();
      if (!source || this.isStopped) return;

      this.eventSource = source;
      this.isConnected = true;
      this.options.onStart?.();

      source.onmessage = (e: MessageEvent) => {
        if (this.isStopped) return;
        try {
          const parsed = JSON.parse(e.data) as T;
          this.options.onData?.(parsed);
          this.options.onYield?.(parsed);
        } catch (err) {
          const error = err instanceof Error ? err : new Error("Invalid JSON");
          this.options.onError?.(error);
        }
      };

      source.onerror = (evt: Event) => {
        if (this.isStopped) return;

        const error = new Error("Event stream error: " + evt);
        this.options.onError?.(error);

        this.cleanup();

        if (!this.scheduleReconnect()) {
          this.stop();
        }
      };
    } catch (err) {
      if (this.isStopped) return;

      const error = err instanceof Error ? err : new Error("createEventSource failed");
      this.options.onError?.(error);

      if (!this.scheduleReconnect()) {
        this.stop();
      }
    }
  }
} 