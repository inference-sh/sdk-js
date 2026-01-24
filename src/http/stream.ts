/** Partial data structure from server (contains data and list of updated fields) */
export interface PartialDataWrapper<T> {
  data: T;
  fields: string[];
}

export interface StreamManagerOptions<T> {
  createEventSource: () => Promise<EventSource | null>;
  autoReconnect?: boolean;
  maxReconnects?: number;
  reconnectDelayMs?: number;
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStop?: () => void;
  /** Called with the extracted data (handles both full and partial data) */
  onData?: (data: T) => void;
  /** Called specifically for partial updates with data and the list of updated fields */
  onPartialData?: (data: T, fields: string[]) => void;
}

/**
 * Check if the parsed data is a partial data wrapper from the server.
 * The server sends partial updates in the format: { data: T, fields: string[] }
 */
function isPartialDataWrapper<T>(parsed: unknown): parsed is PartialDataWrapper<T> {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'data' in parsed &&
    'fields' in parsed &&
    Array.isArray((parsed as PartialDataWrapper<T>).fields)
  );
}

export class StreamManager<T> {
  private options: StreamManagerOptions<T>;
  private eventSource: EventSource | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialConnectionAttempts = 0;
  private isConnected = false;
  private isStopped = false;
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor(options: StreamManagerOptions<T>) {
    this.options = {
      autoReconnect: true,
      maxReconnects: 5,
      reconnectDelayMs: 1000,
      ...options,
    };
  }

  /**
   * Add a listener for typed SSE events (e.g., 'chats', 'chat_messages')
   * Used when server sends events with `event: eventName` header
   */
  addEventListener<E = unknown>(eventName: string, callback: (data: E) => void): () => void {
    const listeners = this.eventListeners.get(eventName) || new Set();
    listeners.add(callback as (data: unknown) => void);
    this.eventListeners.set(eventName, listeners);

    // If already connected, set up the listener on the existing EventSource
    if (this.eventSource) {
      this.setupEventListener(this.eventSource, eventName);
    }

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

  private setupEventListener(source: EventSource, eventName: string) {
    source.addEventListener(eventName, (e: MessageEvent) => {
      if (this.isStopped) return;
      try {
        const parsed = JSON.parse(e.data);
        const listeners = this.eventListeners.get(eventName);
        if (listeners?.size) {
          // Extract actual data from partial wrapper if present
          // Server may send {data: T, fields: [...]} for typed events too
          const actualData = isPartialDataWrapper(parsed) ? parsed.data : parsed;
          listeners.forEach(callback => callback(actualData));
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Invalid JSON');
        this.options.onError?.(error);
      }
    });
  }

  private setupAllEventListeners(source: EventSource) {
    this.eventListeners.forEach((_, eventName) => {
      this.setupEventListener(source, eventName);
    });
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

      // Set up typed event listeners (for events with `event: eventName` header)
      this.setupAllEventListeners(source);

      source.onmessage = (e: MessageEvent) => {
        if (this.isStopped) return;
        try {
          const parsed = JSON.parse(e.data);

          // Check if this is a partial data wrapper from the server
          if (isPartialDataWrapper<T>(parsed)) {
            // Call onPartialData if provided, otherwise onData with extracted data
            if (this.options.onPartialData) {
              this.options.onPartialData(parsed.data, parsed.fields);
            } else {
              this.options.onData?.(parsed.data);
            }
          } else {
            // Not a partial wrapper, treat as full data
            this.options.onData?.(parsed as T);
          }
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
