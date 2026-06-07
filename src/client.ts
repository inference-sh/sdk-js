import {
  ApiAppRunRequest,
  TaskDTO as Task,
  APIResponse,
  PartialFile,
  File,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled,
  RequirementError,
  ChatDTO,
  ChatMessageDTO,
  AgentTool,
  AgentRuntimeConfig,
  InternalToolsConfig,
  ToolTypeClient,
  ToolInvocationStatusAwaitingInput,
} from './types';
import { StreamManager } from './stream';
import { EventSource } from 'eventsource';
import { InferenceError, RequirementsNotMetException } from './errors';

// =============================================================================
// Agent Types
// =============================================================================

/**
 * Ad-hoc agent configuration - extends AgentRuntimeConfig with core_app_ref required
 * Uses Partial to make name/system_prompt optional for ad-hoc usage
 */
export type AdHocAgentConfig = Partial<AgentRuntimeConfig> & {
  /** Core LLM app ref: namespace/name@shortid (required for ad-hoc agents) */
  core_app_ref: string;
};

export interface SendMessageOptions {
  /** File attachments (Blob or base64 data URI) */
  files?: (Blob | string)[];
  /** Callback for message updates */
  onMessage?: (message: ChatMessageDTO) => void;
  /** Callback for chat updates */
  onChat?: (chat: ChatDTO) => void;
  /** Callback when a client tool needs execution */
  onToolCall?: (invocation: { id: string; name: string; args: Record<string, unknown> }) => void;
}

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
  /** Callback for partial updates with list of changed fields */
  onPartialUpdate?: (update: Task, fields: string[]) => void;
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

  /** @internal */
  async _request<T>(
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
    const responseText = await response.text();
    
    // Try to parse as JSON
    let data: APIResponse<T> | { errors?: RequirementError[] } | null = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Not JSON
    }

    // Check for HTTP errors
    if (!response.ok) {
      // Check for RequirementsNotMetException (412 with errors array)
      if (response.status === 412 && data && 'errors' in data && Array.isArray(data.errors)) {
        throw RequirementsNotMetException.fromResponse(data as { errors: RequirementError[] }, response.status);
      }

      // General error handling
      let errorDetail: string | undefined;
      if (data && typeof data === 'object') {
        const apiData = data as APIResponse<T>;
        if (apiData.error) {
          errorDetail = typeof apiData.error === 'object' ? apiData.error.message : String(apiData.error);
        } else if ('message' in data) {
          errorDetail = String((data as { message: string }).message);
        } else {
          errorDetail = JSON.stringify(data);
        }
      } else if (responseText) {
        errorDetail = responseText.slice(0, 500);
      }

      throw new InferenceError(response.status, errorDetail || 'Request failed', responseText);
    }

    const apiResponse = data as APIResponse<T>;
    if (!apiResponse?.success) {
      throw new InferenceError(
        response.status,
        apiResponse?.error?.message || 'Request failed',
        responseText
      );
    }

    return apiResponse.data as T;
  }

  /** @internal */
  _createEventSource(endpoint: string): EventSource {
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
   * App reference format: `namespace/name@shortid` (version is required)
   * 
   * The short ID ensures your code always runs the same version,
   * protecting against breaking changes from app updates.
   *
   * @example
   * ```typescript
   * // Run a specific version (required)
   * const result = await client.run({ 
   *   app: 'okaris/flux@abc1',  // version @abc1 is pinned
   *   input: { prompt: 'hello' } 
   * });
   *
   * // With status updates
   * const result = await client.run(
   *   { app: 'okaris/flux@abc1', input: { prompt: 'hello' } },
   *   { onUpdate: (update) => console.log(update.status) }
   * );
   *
   * // Fire and forget
   * const task = await client.run(
   *   { app: 'okaris/flux@abc1', input: {} }, 
   *   { wait: false }
   * );
   * ```
   */
  async run(params: ApiAppRunRequest, options: RunOptions = {}): Promise<Task> {
    const {
      onUpdate,
      onPartialUpdate,
      wait = true,
      autoReconnect = true,
      maxReconnects = 5,
      reconnectDelayMs = 1000,
    } = options;

    // Process input data and upload any files
    const processedInput = await this.processInputData(params.input);
    const task = await this._request<Task>("post", "/apps/run", {
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
        createEventSource: async () => this._createEventSource(`/tasks/${task.id}/stream`),
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
        onPartialData: (data, fields) => {
          // Call onPartialUpdate if provided
          if (onPartialUpdate) {
            const stripped = this._stripTask(data);
            onPartialUpdate(stripped, fields);
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

    const response = await this._request<File[]>("post", "/files", {
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
    return this._request<void>("post", `/tasks/${taskId}/cancel`);
  }

  /**
   * Create an agent for chat interactions
   * 
   * @param config - Either a template reference string (namespace/name@version) or ad-hoc config
   * @returns An Agent instance for chat operations
   * 
   * @example
   * ```typescript
   * // Template agent
   * const agent = client.agent('okaris/assistant@abc123')
   * 
   * // Ad-hoc agent
   * const agent = client.agent({
   *   core_app_ref: 'infsh/claude-sonnet-4@xyz789',
   *   system_prompt: 'You are a helpful assistant',
   *   tools: [...]
   * })
   * 
   * // Send messages
   * const response = await agent.sendMessage('Hello!')
   * ```
   */
  agent(config: string | AdHocAgentConfig): Agent {
    return new Agent(this, config);
  }
}

// =============================================================================
// Agent Class
// =============================================================================

/**
 * Agent for chat interactions
 * 
 * Created via `client.agent()` - do not instantiate directly.
 */
export class Agent {
  private readonly client: Inference;
  private readonly config: string | AdHocAgentConfig;
  private chatId: string | null = null;
  private stream: StreamManager<unknown> | null = null;
  private dispatchedToolCalls: Set<string> = new Set();

  /** @internal */
  constructor(client: Inference, config: string | AdHocAgentConfig) {
    this.client = client;
    this.config = config;
  }

  /** Get current chat ID */
  get currentChatId(): string | null {
    return this.chatId;
  }

  /** Send a message to the agent */
  async sendMessage(text: string, options: SendMessageOptions = {}): Promise<ChatMessageDTO> {
    const isTemplate = typeof this.config === 'string';
    
    // Upload files if provided
    let imageUri: string | undefined;
    let fileUris: string[] | undefined;
    
    if (options.files && options.files.length > 0) {
      const uploadedFiles = await Promise.all(
        options.files.map(f => this.client.uploadFile(f))
      );
      
      const images = uploadedFiles.filter(f => f.content_type?.startsWith('image/'));
      const others = uploadedFiles.filter(f => !f.content_type?.startsWith('image/'));
      
      if (images.length > 0) imageUri = images[0].uri;
      if (others.length > 0) fileUris = others.map(f => f.uri);
    }
    
    const body = isTemplate 
      ? {
          chat_id: this.chatId,
          agent_ref: this.config as string,
          input: { text, image: imageUri, files: fileUris, role: 'user', context: [], system_prompt: '', context_size: 0 },
        }
      : {
          chat_id: this.chatId,
          agent_config: this.config as AdHocAgentConfig,
          input: { text, image: imageUri, files: fileUris, role: 'user', context: [], system_prompt: '', context_size: 0 },
        };

    const response = await this.client._request<{ user_message: ChatMessageDTO; assistant_message: ChatMessageDTO }>(
      'post',
      '/agents/run',
      { data: body }
    );

    // Start streaming for new chats or continue existing stream
    const isNewChat = !this.chatId && response.assistant_message.chat_id;
    if (isNewChat) {
      this.chatId = response.assistant_message.chat_id;
    }

    // Wait for streaming to complete if callbacks are provided
    if (options.onMessage || options.onChat || options.onToolCall) {
      await this.streamUntilIdle(options);
    }

    return response.assistant_message;
  }

  /** Get chat by ID */
  async getChat(chatId?: string): Promise<ChatDTO | null> {
    const id = chatId || this.chatId;
    if (!id) return null;
    return this.client._request<ChatDTO>('get', `/chats/${id}`);
  }

  /** Stop the current chat generation */
  async stopChat(): Promise<void> {
    if (!this.chatId) return;
    await this.client._request<void>('post', `/chats/${this.chatId}/stop`);
  }

  /** Submit a tool result */
  async submitToolResult(toolInvocationId: string, result: string): Promise<void> {
    await this.client._request<void>('post', `/tools/${toolInvocationId}`, {
      data: { result },
    });
  }

  /** Stop streaming and cleanup */
  disconnect(): void {
    this.stream?.stop();
    this.stream = null;
  }

  /** Reset the agent (start fresh chat) */
  reset(): void {
    this.disconnect();
    this.chatId = null;
    this.dispatchedToolCalls.clear();
  }

  /** Stream events until chat becomes idle */
  private streamUntilIdle(options: SendMessageOptions): Promise<void> {
    if (!this.chatId) return Promise.resolve();

    return new Promise((resolve) => {
      // Stop any existing stream
      this.stream?.stop();

      this.stream = new StreamManager<unknown>({
        createEventSource: async () => this.client._createEventSource(`/chats/${this.chatId}/stream`),
        autoReconnect: true,
      });

      this.stream.addEventListener<ChatDTO>('chats', (chat) => {
        options.onChat?.(chat);
        // Resolve when chat becomes idle (generation complete)
        if (chat.status === 'idle') {
          resolve();
        }
      });

      this.stream.addEventListener<ChatMessageDTO>('chat_messages', (message) => {
        options.onMessage?.(message);
        
        if (message.tool_invocations && options.onToolCall) {
          for (const inv of message.tool_invocations) {
            // Skip if already dispatched
            if (this.dispatchedToolCalls.has(inv.id)) continue;
            
            if (inv.type === ToolTypeClient && inv.status === ToolInvocationStatusAwaitingInput) {
              this.dispatchedToolCalls.add(inv.id);
              options.onToolCall({
                id: inv.id,
                name: inv.function?.name || '',
                args: inv.function?.arguments || {},
              });
            }
          }
        }
      });

      this.stream.connect();
    });
  }
}

/** 
 * Factory function for creating an Inference client (lowercase for branding)
 * @example
 * ```typescript
 * const client = inference({ apiKey: 'your-api-key' });
 * ```
 */
export function inference(config: InferenceConfig): Inference {
  return new Inference(config);
} 