import {
  ApiTaskRequest,
  TaskDTO as Task,
  APIResponse,
  PartialFile,
  File,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled,
} from './types';
import { StreamManager } from './stream';
import { EventSource } from 'eventsource';

export interface UploadFileOptions {
  filename?: string;
  contentType?: string;
  path?: string;
  public?: boolean;
}

export interface InferenceConfig {
  /** Your inference.sh API key */
  apiKey: string;
  /** Custom API base URL (defaults to https://api.inference.sh) */
  baseUrl?: string;
}

export interface RunOptions {
  /** Callback for real-time status updates */
  onUpdate?: (update: Task) => void;
  /** Wait for task completion (default: true) */
  wait?: boolean;
  /** Auto-reconnect on connection loss (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 5) */
  maxReconnects?: number;
  /** Delay between reconnection attempts in ms (default: 1000) */
  reconnectDelayMs?: number;
}

/**
 * Inference.sh SDK Client
 *
 * @example
 * ```typescript
 * const client = new Inference({ apiKey: 'your-api-key' });
 * const result = await client.run({ app: 'my-app', input: { prompt: 'hello' } });
 * ```
 */
export class Inference {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: InferenceConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.inference.sh";
  }

  private async request<T>(
    method: "get" | "post" | "put" | "delete",
    endpoint: string,
    options: {
      params?: Record<string, any>;
      data?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers,
      credentials: "include",
    };

    if (options.data) {
      fetchOptions.body = JSON.stringify(options.data);
    }

    const response = await fetch(url.toString(), fetchOptions);
    const data = await response.json() as APIResponse<T>;

    if (!data.success) {
      throw new Error(data.error?.message || "Request failed");
    }

    return data.data as T;
  }

  private createEventSource(endpoint: string): EventSource {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    return new EventSource(url.toString(), {
      fetch: (input, init) => fetch(input, {
        ...init,
        headers: {
          ...init.headers,
          Authorization: `Bearer ${this.apiKey}`,
        },
      }),
    });
  }

  private _stripTask(task: Task): Task {
    // Keep required fields and add stripped ones
    return {
      ...task,
      id: task.id,
      created_at: task.created_at,
      updated_at: task.updated_at,
      input: task.input,
      output: task.output,
      logs: task.logs,
      status: task.status,
    };
  }

  private async processInputData(input: any, path: string = 'root'): Promise<any> {
    if (!input) {
      return input;
    }

    // Handle arrays
    if (Array.isArray(input)) {
      return Promise.all(
        input.map((item, idx) => this.processInputData(item, `${path}[${idx}]`))
      );
    }

    // Handle objects
    if (typeof input === 'object') {
      // Handle Blob
      if (typeof Blob !== "undefined" && input instanceof Blob) {
        const file = await this.uploadFile(input);
        return file.uri;
      }

      // Recursively process object properties
      const processed: Record<string, any> = {};
      for (const [key, value] of Object.entries(input)) {
        processed[key] = await this.processInputData(value, `${path}.${key}`);
      }
      return processed;
    }

    // Handle base64 strings or data URIs
    if (
      typeof input === 'string' &&
      (
        input.startsWith('data:') ||
        /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/.test(input)
      )
    ) {
      const file = await this.uploadFile(input);
      return file.uri;
    }

    return input;
  }

  /**
   * Run a task on inference.sh
   *
   * @param params - Task parameters including app and input
   * @param options - Run options for waiting, updates, and reconnection
   * @returns The completed task result
   *
   * @example
   * ```typescript
   * // Simple usage - wait for result
   * const result = await client.run({ app: 'my-app', input: { prompt: 'hello' } });
   *
   * // With status updates
   * const result = await client.run(
   *   { app: 'my-app', input: { prompt: 'hello' } },
   *   { onUpdate: (update) => console.log(update.status) }
   * );
   *
   * // Fire and forget
   * const task = await client.run({ app: 'my-app', input: {} }, { wait: false });
   * ```
   */
  async run(params: ApiTaskRequest, options: RunOptions = {}): Promise<Task> {
    const {
      onUpdate,
      wait = true,
      autoReconnect = true,
      maxReconnects = 5,
      reconnectDelayMs = 1000,
    } = options;

    // Process input data and upload any files
    const processedInput = await this.processInputData(params.input);
    const task = await this.request<Task>("post", "/run", {
      data: {
        ...params,
        input: processedInput
      },
    });

    // Return immediately if not waiting
    if (!wait) {
      return this._stripTask(task);
    }

    // Wait for completion with optional updates
    return new Promise<Task>((resolve, reject) => {
      const streamManager = new StreamManager<Task>({
        createEventSource: async () => this.createEventSource(`/tasks/${task.id}/stream`),
        autoReconnect,
        maxReconnects,
        reconnectDelayMs,
        onData: (data) => {
          // Strip and send update if callback provided
          const stripped = this._stripTask(data);
          onUpdate?.(stripped);

          if (data.status === TaskStatusCompleted) {
            streamManager.stop();
            resolve(stripped);
          } else if (data.status === TaskStatusFailed) {
            streamManager.stop();
            reject(new Error(data.error || "task failed"));
          } else if (data.status === TaskStatusCancelled) {
            streamManager.stop();
            reject(new Error("task cancelled"));
          }
        },
        onError: (error) => {
          reject(error);
          streamManager.stop();
        },
      });

      streamManager.connect();
    });
  }

  async uploadFile(
    data: string | Blob,
    options: UploadFileOptions = {}
  ): Promise<File> {
    // Step 1: Create the file record
    const fileRequest: PartialFile = {
      uri: '', // Empty URI as it will be set by the server
      filename: options.filename,
      content_type: options.contentType || (data instanceof Blob ? data.type : 'application/octet-stream'),
      path: options.path,
      size: data instanceof Blob ? data.size : undefined,
    };

    const response = await this.request<File[]>("post", "/files", {
      data: {
        files: [fileRequest]
      }
    });

    const file = response[0];

    // Step 2: Upload the file content to the provided upload_url
    if (!file.upload_url) {
      throw new Error('No upload URL provided by the server');
    }

    let contentToUpload: Blob;
    if (data instanceof Blob) {
      contentToUpload = data;
    } else {
      // If it's a base64 string, convert it to a Blob
      if (data.startsWith('data:')) {
        const matches = data.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          throw new Error('Invalid base64 data URI format');
        }
        const binaryStr = atob(matches[2]);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        contentToUpload = new Blob([bytes], { type: matches[1] });
      } else {
        // Assume it's a clean base64 string
        const binaryStr = atob(data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        contentToUpload = new Blob([bytes], { type: options.contentType || 'application/octet-stream' });
      }
    }

    // Upload to S3 using the signed URL
    const uploadResponse = await fetch(file.upload_url, {
      method: 'PUT',
      body: contentToUpload,
      headers: {
        'Content-Type': contentToUpload.type,
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload file content: ${uploadResponse.statusText}`);
    }

    return file;
  }

/**
   * Cancel a running task
   *
   * @param taskId - The ID of the task to cancel
   */
  async cancel(taskId: string): Promise<void> {
    return this.request<void>("post", `/tasks/${taskId}/cancel`);
  }
}

/**
 * @deprecated Use `Inference` instead. Will be removed in v1.0.0
 */
export const inference = Inference; 