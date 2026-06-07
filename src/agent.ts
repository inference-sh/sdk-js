/**
 * Headless Agent SDK
 * 
 * Chat with AI agents without UI dependencies.
 */

import { StreamManager } from './stream';
import { EventSource } from 'eventsource';
import {
  ChatDTO,
  ChatMessageDTO,
  AgentTool,
  InternalToolsConfig,
  ChatStatusIdle,
  ChatStatusBusy,
  ToolTypeClient,
  ToolInvocationStatusAwaitingInput,
} from './types';

// =============================================================================
// Types
// =============================================================================

export interface AgentConfig {
  apiKey: string;
  baseUrl?: string;
}

/** Ad-hoc agent configuration (no saved template) */
export interface AdHocAgentOptions {
  /** Core LLM app: namespace/name@shortid */
  coreApp: string;
  /** LLM parameters */
  coreAppInput?: Record<string, unknown>;
  /** Agent name */
  name?: string;
  /** System prompt */
  systemPrompt?: string;
  /** Tools */
  tools?: AgentTool[];
  /** Internal tools config */
  internalTools?: InternalToolsConfig;
}

/** Template agent configuration */
export interface TemplateAgentOptions {
  /** Agent reference: namespace/name@version (e.g., "my-org/assistant@abc123") */
  agent: string;
}

export type AgentOptions = AdHocAgentOptions | TemplateAgentOptions;

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

// =============================================================================
// Agent Class
// =============================================================================

export class Agent {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly options: AgentOptions;
  
  private chatId: string | null = null;
  private messageStream: StreamManager<ChatMessageDTO> | null = null;
  private chatStream: StreamManager<ChatDTO> | null = null;

  constructor(config: AgentConfig, options: AgentOptions) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.inference.sh';
    this.options = options;
  }

  /** Get current chat ID */
  get currentChatId(): string | null {
    return this.chatId;
  }

  /** Send a message to the agent */
  async sendMessage(text: string, options: SendMessageOptions = {}): Promise<ChatMessageDTO> {
    const isAdHoc = 'coreApp' in this.options;
    
    // Upload files if provided
    let imageUri: string | undefined;
    let fileUris: string[] | undefined;
    
    if (options.files && options.files.length > 0) {
      const uploadedFiles = await Promise.all(
        options.files.map(f => this.uploadFile(f))
      );
      
      // Separate images from other files
      const images = uploadedFiles.filter(f => f.content_type?.startsWith('image/'));
      const others = uploadedFiles.filter(f => !f.content_type?.startsWith('image/'));
      
      if (images.length > 0) imageUri = images[0].uri;
      if (others.length > 0) fileUris = others.map(f => f.uri);
    }
    
    const endpoint = isAdHoc ? '/agents/message' : '/agents/message';
    const body = isAdHoc 
      ? {
          chat_id: this.chatId,
          core_app: (this.options as AdHocAgentOptions).coreApp,
          core_app_input: (this.options as AdHocAgentOptions).coreAppInput,
          name: (this.options as AdHocAgentOptions).name,
          system_prompt: (this.options as AdHocAgentOptions).systemPrompt,
          tools: (this.options as AdHocAgentOptions).tools,
          internal_tools: (this.options as AdHocAgentOptions).internalTools,
          input: { text, image: imageUri, files: fileUris, role: 'user', context: [], system_prompt: '', context_size: 0 },
        }
      : {
          chat_id: this.chatId,
          agent: (this.options as TemplateAgentOptions).agent,
          input: { text, image: imageUri, files: fileUris, role: 'user', context: [], system_prompt: '', context_size: 0 },
        };

    const response = await this.request<{ user_message: ChatMessageDTO; assistant_message: ChatMessageDTO }>(
      'post',
      endpoint,
      { data: body }
    );

    // Update chat ID if new
    if (!this.chatId && response.assistant_message.chat_id) {
      this.chatId = response.assistant_message.chat_id;
      this.startStreaming(options);
    }

    return response.assistant_message;
  }

  /** Get chat by ID */
  async getChat(chatId?: string): Promise<ChatDTO | null> {
    const id = chatId || this.chatId;
    if (!id) return null;
    
    return this.request<ChatDTO>('get', `/chats/${id}`);
  }

  /** Stop the current chat generation */
  async stopChat(): Promise<void> {
    if (!this.chatId) return;
    await this.request<void>('post', `/chats/${this.chatId}/stop`);
  }

  /** Submit a tool result */
  async submitToolResult(toolInvocationId: string, result: string): Promise<void> {
    if (!this.chatId) throw new Error('No active chat');
    await this.request<void>('post', `/chats/${this.chatId}/tool-result`, {
      data: { tool_invocation_id: toolInvocationId, result },
    });
  }

  /** Stop streaming and cleanup */
  disconnect(): void {
    this.messageStream?.stop();
    this.chatStream?.stop();
    this.messageStream = null;
    this.chatStream = null;
  }

  /** Reset the agent (start fresh chat) */
  reset(): void {
    this.disconnect();
    this.chatId = null;
  }

  /** Upload a file and return the file object */
  async uploadFile(data: Blob | string): Promise<{ uri: string; content_type?: string }> {
    // Create file record
    let contentType = 'application/octet-stream';
    let size: number | undefined;
    
    if (data instanceof Blob) {
      contentType = data.type || 'application/octet-stream';
      size = data.size;
    }
    
    const files = await this.request<Array<{ uri: string; upload_url: string; content_type?: string }>>(
      'post',
      '/files',
      { data: { files: [{ uri: '', content_type: contentType, size }] } }
    );
    
    const file = files[0];
    if (!file.upload_url) throw new Error('No upload URL');
    
    // Convert to blob if needed
    let blob: Blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (data.startsWith('data:')) {
      const matches = data.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) throw new Error('Invalid data URI');
      const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
      blob = new Blob([bytes], { type: matches[1] });
    } else {
      const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      blob = new Blob([bytes], { type: contentType });
    }
    
    // Upload to signed URL
    const uploadResp = await fetch(file.upload_url, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': blob.type },
    });
    
    if (!uploadResp.ok) throw new Error('Upload failed');
    
    return { uri: file.uri, content_type: file.content_type };
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private startStreaming(options: SendMessageOptions): void {
    if (!this.chatId) return;

    // Message stream
    this.messageStream = new StreamManager<ChatMessageDTO>({
      createEventSource: async () => this.createEventSource(`/chats/${this.chatId}/messages/stream`),
      autoReconnect: true,
      onData: (message) => {
        options.onMessage?.(message);
        
        // Check for client tool invocations
        if (message.tool_invocations && options.onToolCall) {
          for (const inv of message.tool_invocations) {
            if (inv.type === ToolTypeClient && inv.status === ToolInvocationStatusAwaitingInput) {
              options.onToolCall({
                id: inv.id,
                name: inv.function?.name || '',
                args: inv.function?.arguments || {},
              });
            }
          }
        }
      },
    });

    // Chat stream
    this.chatStream = new StreamManager<ChatDTO>({
      createEventSource: async () => this.createEventSource(`/chats/${this.chatId}/stream`),
      autoReconnect: true,
      onData: (chat) => options.onChat?.(chat),
    });

    this.messageStream.connect();
    this.chatStream.connect();
  }

  private createEventSource(endpoint: string): EventSource {
    return new EventSource(`${this.baseUrl}${endpoint}`, {
      fetch: (input, init) => fetch(input, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${this.apiKey}` },
      }),
    });
  }

  private async request<T>(
    method: 'get' | 'post',
    endpoint: string,
    options: { data?: Record<string, unknown> } = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: options.data ? JSON.stringify(options.data) : undefined,
    });

    const json = await response.json();
    if (!response.ok || !json.success) {
      throw new Error(json.error?.message || 'Request failed');
    }
    return json.data;
  }
}

