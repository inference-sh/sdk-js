import { HttpClient } from '../http/client';
import { StreamManager } from '../http/stream';
import { FilesAPI } from './files';
import {
  ChatDTO,
  ChatMessageDTO,
  AgentConfig,
  AgentDTO,
  AgentVersionDTO,
  CreateAgentRequest,
  File,
  ToolTypeClient,
  ToolInvocationStatusAwaitingInput,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/** Internal tool definition returned by getInternalTools */
export interface InternalToolDefinition {
  id: string;
  name: string;
  description: string;
  tools: string[];
  scope: string;
}

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

/**
 * Agent for chat interactions
 *
 * Created via `client.agent()` - do not instantiate directly.
 */
export class Agent {
  private readonly http: HttpClient;
  private readonly files: FilesAPI;
  private readonly config: string | AgentConfig;
  private readonly agentName: string | undefined;
  private chatId: string | null = null;
  private stream: StreamManager<unknown> | null = null;
  private dispatchedToolCalls: Set<string> = new Set();

  /** @internal */
  constructor(http: HttpClient, files: FilesAPI, config: string | AgentConfig, options?: AgentOptions) {
    this.http = http;
    this.files = files;
    this.config = config;
    this.agentName = options?.name;
  }

  /** Get current chat ID */
  get currentChatId(): string | null {
    return this.chatId;
  }

  /** Send a message to the agent */
  async sendMessage(
    text: string,
    options: SendMessageOptions = {}
  ): Promise<{ userMessage: ChatMessageDTO; assistantMessage: ChatMessageDTO }> {
    const isTemplate = typeof this.config === 'string';
    const hasCallbacks = !!(options.onMessage || options.onChat || options.onToolCall);

    // Process files - either already uploaded (FileDTO with uri) or needs upload (Blob)
    let imageUris: string[] | undefined;
    let fileUris: string[] | undefined;

    if (options.files && options.files.length > 0) {
      const toUpload: Blob[] = [];
      const alreadyUploaded: File[] = [];

      for (const file of options.files) {
        if ('uri' in file && typeof (file as File).uri === 'string') {
          alreadyUploaded.push(file as File);
        } else {
          toUpload.push(file as Blob);
        }
      }

      const uploadedFiles =
        toUpload.length > 0 ? await Promise.all(toUpload.map((blob) => this.files.upload(blob))) : [];

      const allFiles = [...alreadyUploaded, ...uploadedFiles];

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
    const response = await this.http.request<{ user_message: ChatMessageDTO; assistant_message: ChatMessageDTO }>(
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
    return this.http.request<ChatDTO>('get', `/chats/${id}`);
  }

  /** Stop the current chat generation */
  async stopChat(): Promise<void> {
    if (!this.chatId) return;
    await this.http.request<void>('post', `/chats/${this.chatId}/stop`);
  }

  /**
   * Submit a tool result
   */
  async submitToolResult(
    toolInvocationId: string,
    resultOrAction: string | { action: { type: string; payload?: Record<string, unknown> }; form_data?: Record<string, unknown> }
  ): Promise<void> {
    const result = typeof resultOrAction === 'string' ? resultOrAction : JSON.stringify(resultOrAction);
    await this.http.request<void>('post', `/tools/${toolInvocationId}`, { data: { result } });
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
   */
  startStreaming(options: Omit<SendMessageOptions, 'files'> = {}): void {
    if (!this.chatId) return;
    this.streamUntilIdle(options);
  }

  /** Stream events until chat becomes idle */
  private streamUntilIdle(options: SendMessageOptions): Promise<void> {
    if (!this.chatId) return Promise.resolve();

    return new Promise((resolve) => {
      this.stream?.stop();

      this.stream = new StreamManager<unknown>({
        createEventSource: async () => this.http.createEventSource(`/chats/${this.chatId}/stream`),
        autoReconnect: true,
      });

      this.stream.addEventListener<ChatDTO>('chats', (chat) => {
        options.onChat?.(chat);
        if (chat.status === 'idle') {
          resolve();
        }
      });

      this.stream.addEventListener<ChatMessageDTO>('chat_messages', (message) => {
        options.onMessage?.(message);

        if (message.tool_invocations && options.onToolCall) {
          for (const inv of message.tool_invocations) {
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
 * Agents API
 */
export class AgentsAPI {
  constructor(
    private readonly http: HttpClient,
    private readonly files: FilesAPI
  ) { }

  // ==========================================================================
  // Agent Template CRUD (stored agent configurations)
  // ==========================================================================

  /**
   * List agent templates with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<AgentDTO>> {
    return this.http.request<CursorListResponse<AgentDTO>>('post', '/agents/list', { data: params });
  }

  /**
   * Get an agent template by ID
   */
  async get(agentId: string): Promise<AgentDTO> {
    return this.http.request<AgentDTO>('get', `/agents/${agentId}`);
  }

  /**
   * Create a new agent template or create a new version of an existing agent
   */
  async createAgent(data: CreateAgentRequest): Promise<AgentDTO> {
    return this.http.request<AgentDTO>('post', '/agents', { data });
  }

  /**
   * Update an agent template
   */
  async update(agentId: string, data: Partial<AgentDTO>): Promise<AgentDTO> {
    return this.http.request<AgentDTO>('post', `/agents/${agentId}`, { data });
  }

  /**
   * Delete an agent template
   */
  async delete(agentId: string): Promise<void> {
    return this.http.request<void>('delete', `/agents/${agentId}`);
  }

  /**
   * Duplicate an agent template
   */
  async duplicate(agentId: string): Promise<AgentDTO> {
    return this.http.request<AgentDTO>('post', `/agents/${agentId}/duplicate`);
  }

  /**
   * List agent template versions
   */
  async listVersions(agentId: string, params?: Partial<CursorListRequest>): Promise<CursorListResponse<AgentVersionDTO>> {
    return this.http.request<CursorListResponse<AgentVersionDTO>>('post', `/agents/${agentId}/versions/list`, { data: params });
  }

  /**
   * Transfer agent ownership to another team
   */
  async transferOwnership(agentId: string, newTeamId: string): Promise<AgentDTO> {
    return this.http.request<AgentDTO>('post', `/agents/${agentId}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Update agent visibility
   */
  async updateVisibility(agentId: string, visibility: string): Promise<AgentDTO> {
    return this.http.request<AgentDTO>('post', `/agents/${agentId}/visibility`, { data: { visibility } });
  }

  /**
   * Get a specific agent version
   */
  async getVersion(agentId: string, versionId: string): Promise<AgentVersionDTO> {
    return this.http.request<AgentVersionDTO>('get', `/agents/${agentId}/versions/${versionId}`);
  }

  /**
   * Get internal tools for the agent
   */
  async getInternalTools(): Promise<InternalToolDefinition[]> {
    return this.http.request<InternalToolDefinition[]>('get', '/agents/internal-tools');
  }

  // ==========================================================================
  // Agent Runtime (chat interactions)
  // ==========================================================================

  /**
   * Create an agent instance for chat interactions
   */
  create(config: string | AgentConfig, options?: AgentOptions): Agent {
    return new Agent(this.http, this.files, config, options);
  }

  /**
   * Submit a tool result
   */
  async submitToolResult(
    toolInvocationId: string,
    resultOrAction: string | { action: { type: string; payload?: Record<string, unknown> }; form_data?: Record<string, unknown> }
  ): Promise<void> {
    const result = typeof resultOrAction === 'string' ? resultOrAction : JSON.stringify(resultOrAction);
    await this.http.request<void>('post', `/tools/${toolInvocationId}`, { data: { result } });
  }
}

export function createAgentsAPI(http: HttpClient, files: FilesAPI): AgentsAPI {
  return new AgentsAPI(http, files);
}
