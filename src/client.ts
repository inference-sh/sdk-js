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
  AgentConfig,
  InternalToolsConfig,
  ToolTypeClient,
  ToolInvocationStatusAwaitingInput,
} from './types';
import { StreamManager } from './stream';
import { EventSource } from 'eventsource';
import { InferenceError, RequirementsNotMetException } from './errors';

/** Options for creating an agent */
export interface AgentOptions {
  /** Optional name for the adhoc agent (used for deduplication and display) */
  name?: string;
}

export interface SendMessageOptions {
  /** File attachments - Blob (will be uploaded) or FileDTO (already uploaded, has uri) */
  files?: (Blob | File)[];
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
  /** Your inference.sh API key (required unless using proxyUrl) */
  apiKey?: string;
  /** Custom API base URL (defaults to https://api.inference.sh) */
  baseUrl?: string;
  /**
   * Proxy URL for frontend apps.
   * When set, requests are routed through your proxy server to protect API keys.
   * @example "/api/inference/proxy"
   * @example "https://myapp.com/api/inference/proxy"
   */
  proxyUrl?: string;
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
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly proxyUrl: string | undefined;

  constructor(config: InferenceConfig) {
    // Either apiKey or proxyUrl must be provided
    if (!config.apiKey && !config.proxyUrl) {
      throw new Error('Either apiKey or proxyUrl is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://api.inference.sh";
    this.proxyUrl = config.proxyUrl;
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
    // Build the target URL (always points to the API)
    const targetUrl = new URL(`${this.baseUrl}${endpoint}`);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          targetUrl.searchParams.append(key, String(value));
        }
      });
    }

    // In proxy mode, requests go to the proxy with target URL in a header
    const isProxyMode = !!this.proxyUrl;
    const fetchUrl = isProxyMode ? this.proxyUrl! : targetUrl.toString();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isProxyMode) {
      // Proxy mode: send target URL as header, no auth (proxy handles it)
      headers["x-inf-target-url"] = targetUrl.toString();
    } else {
      // Direct mode: include authorization header
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers,
      credentials: "include",
    };

    if (options.data) {
      fetchOptions.body = JSON.stringify(options.data);
    }

    const response = await fetch(fetchUrl, fetchOptions);
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
      // Build a helpful error message
      let errorMessage = apiResponse?.error?.message;
      if (!errorMessage) {
        // No error message provided - show the response for debugging
        errorMessage = `Request failed (success=false). Response: ${responseText.slice(0, 500)}`;
      }
      throw new InferenceError(
        response.status,
        errorMessage,
        responseText
      );
    }

    return apiResponse.data as T;
  }

  /** @internal */
  _createEventSource(endpoint: string): EventSource {

    const targetUrl = new URL(`${this.baseUrl}${endpoint}`);
    const isProxyMode = !!this.proxyUrl;

    // For proxy mode: Browser EventSource can't send custom headers,
    // so append target URL as query param instead
    let fetchUrl: string;
    if (isProxyMode) {
      const proxyUrlWithQuery = new URL(this.proxyUrl!, window?.location?.origin || 'http://localhost');
      proxyUrlWithQuery.searchParams.set('__inf_target', targetUrl.toString());
      fetchUrl = proxyUrlWithQuery.toString();
    } else {
      fetchUrl = targetUrl.toString();
    }

    return new EventSource(fetchUrl, {
      fetch: (input, init) => {
        const headers: Record<string, string> = {
          ...(init?.headers as Record<string, string>),
        };

        if (isProxyMode) {
          // Proxy mode: also send target URL as header (for non-browser clients)
          headers["x-inf-target-url"] = targetUrl.toString();
        } else {
          // Direct mode: include authorization header
          headers["Authorization"] = `Bearer ${this.apiKey}`;
        }

        return fetch(input, {
          ...init,
          headers,
        });
      },
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
   * App reference format: `namespace/name@shortid` or `namespace/name@shortid:function`
   * 
   * The short ID ensures your code always runs the same version.
   * You can optionally specify a function name to run a specific entry point.
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
          // Strip and send partial update if callback provided
          const stripped = this._stripTask(data);
          onPartialUpdate?.(stripped, fields);

          // Also check for status changes in partial updates
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
   * Get a task by ID
   *
   * @param taskId - The ID of the task to fetch
   * @returns The task data
   *
   * @example
   * ```typescript
   * const task = await client.getTask('abc123');
   * console.log(task.status, task.output);
   * ```
   */
  async getTask(taskId: string): Promise<Task> {
    return this._request<Task>("get", `/tasks/${taskId}`);
  }

  /**
   * Create an EventSource for streaming task updates
   *
   * @param taskId - The ID of the task to stream
   * @returns EventSource for SSE streaming
   *
   * @example
   * ```typescript
   * const eventSource = client.streamTask('abc123');
   * // Use with StreamManager for handling updates
   * const manager = new StreamManager({
   *   createEventSource: () => client.streamTask(taskId),
   *   onData: (task) => console.log(task),
   * });
   * ```
   */
  streamTask(taskId: string): EventSource {
    return this._createEventSource(`/tasks/${taskId}/stream`);
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
   * // Ad-hoc agent with name for grouping
   * const agent = client.agent(
   *   { core_app_ref: 'infsh/claude-sonnet-4@xyz789' },
   *   { name: 'My Assistant' }
   * )
   * 
   * // Send messages
   * const response = await agent.sendMessage('Hello!')
   * ```
   */
  agent(config: string | AgentConfig, options?: AgentOptions): Agent {
    return new Agent(this, config, options);
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
  private readonly config: string | AgentConfig;
  private readonly agentName: string | undefined;
  private chatId: string | null = null;
  private stream: StreamManager<unknown> | null = null;
  private dispatchedToolCalls: Set<string> = new Set();

  /** @internal */
  constructor(client: Inference, config: string | AgentConfig, options?: AgentOptions) {
    this.client = client;
    this.config = config;
    this.agentName = options?.name;
  }

  /** Get current chat ID */
  get currentChatId(): string | null {
    return this.chatId;
  }

  /** Send a message to the agent */
  async sendMessage(text: string, options: SendMessageOptions = {}): Promise<{ userMessage: ChatMessageDTO; assistantMessage: ChatMessageDTO }> {
    const isTemplate = typeof this.config === 'string';
    const hasCallbacks = !!(options.onMessage || options.onChat || options.onToolCall);

    // Process files - either already uploaded (FileDTO with uri) or needs upload (Blob)
    let imageUris: string[] | undefined;
    let fileUris: string[] | undefined;

    if (options.files && options.files.length > 0) {
      // Separate files that need uploading from those already uploaded
      const toUpload: Blob[] = [];
      const alreadyUploaded: File[] = [];

      for (const file of options.files) {
        // FileDTO has a uri property, Blob does not
        if ('uri' in file && typeof (file as File).uri === 'string') {
          alreadyUploaded.push(file as File);
        } else {
          toUpload.push(file as Blob);
        }
      }

      // Upload any Blobs that need uploading
      const uploadedFiles = toUpload.length > 0
        ? await Promise.all(toUpload.map((blob) => this.client.uploadFile(blob)))
        : [];

      // Combine all files (already uploaded + newly uploaded)
      const allFiles = [...alreadyUploaded, ...uploadedFiles];

      // Separate images from other files
      const images = allFiles.filter((f) => f.content_type?.startsWith('image/'));
      const others = allFiles.filter((f) => !f.content_type?.startsWith('image/'));

      if (images.length > 0) imageUris = images.map((f) => f.uri);
      if (others.length > 0) fileUris = others.map((f) => f.uri);
    }

    const body: Record<string, unknown> = isTemplate
      ? {
        chat_id: this.chatId,
        agent: this.config as string,
        input: { text, images: imageUris, files: fileUris, role: 'user', context: [], system_prompt: '', context_size: 0 },
      }
      : {
        chat_id: this.chatId,
        agent_config: this.config as AgentConfig,
        agent_name: this.agentName,
        input: { text, images: imageUris, files: fileUris, role: 'user', context: [], system_prompt: '', context_size: 0 },
      };

    // For existing chats with callbacks: Start streaming BEFORE POST so we don't miss updates
    let streamPromise: Promise<void> | null = null;
    if (this.chatId && hasCallbacks) {
      streamPromise = this.streamUntilIdle(options);
    }

    // Make the POST request
    const response = await this.client._request<{ user_message: ChatMessageDTO; assistant_message: ChatMessageDTO }>(
      'post',
      '/agents/run',
      { data: body }
    );

    // For new chats: Set chatId and start streaming immediately after POST
    const isNewChat = !this.chatId && response.assistant_message.chat_id;
    if (isNewChat) {
      this.chatId = response.assistant_message.chat_id;
      if (hasCallbacks) {
        streamPromise = this.streamUntilIdle(options);
      }
    }

    // Wait for streaming to complete
    if (streamPromise) {
      await streamPromise;
    }

    return { userMessage: response.user_message, assistantMessage: response.assistant_message };
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

  /** 
   * Submit a tool result
   * @param toolInvocationId - The tool invocation ID
   * @param resultOrAction - Either a raw result string, or an object with action and optional form_data (will be JSON-serialized)
   */
  async submitToolResult(
    toolInvocationId: string,
    resultOrAction: string | { action: { type: string; payload?: Record<string, unknown> }; form_data?: Record<string, unknown> }
  ): Promise<void> {
    // Serialize widget actions to JSON string
    const result = typeof resultOrAction === 'string'
      ? resultOrAction
      : JSON.stringify(resultOrAction);
    await this.client._request<void>('post', `/tools/${toolInvocationId}`, { data: { result } });
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

  /**
   * Start streaming for the current chat.
   * Call this after sendMessage to receive real-time updates.
   * This is useful when you want to manage streaming separately from sendMessage.
   * 
   * @example
   * ```typescript
   * // Send message without waiting for streaming
   * const { userMessage, assistantMessage } = await agent.sendMessage('hello');
   * 
   * // Start streaming separately
   * agent.startStreaming({
   *   onMessage: (msg) => console.log(msg.content),
   *   onChat: (chat) => console.log(chat.status),
   * });
   * ```
   */
  startStreaming(options: Omit<SendMessageOptions, 'files'> = {}): void {
    if (!this.chatId) return;
    this.streamUntilIdle(options);
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

      // Listen for Chat object updates (status changes)
      this.stream.addEventListener<ChatDTO>('chats', (chat) => {
        options.onChat?.(chat);
        // Resolve when chat becomes idle (generation complete)
        if (chat.status === 'idle') {
          resolve();
        }
      });

      // Listen for ChatMessage updates
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