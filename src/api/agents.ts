import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import { StreamableManager } from '../http/streamable';
import { PollManager } from '../http/poll';
import { FilesAPI } from './files';
import { createLLMDeltaAccumulator, type DeltaAccumulator } from '../delta';
import {
  AgentRunDTO,
  ChatDTO,
  ChatMessageDTO,
  ChatMessageStatusCancelled,
  ChatMessageStatusFailed,
  ChatMessageStatusReady,
  DeltaEvent,
  LLMDelta,
  LLMOutput,
  ResourceStatusDTO,
  AgentConfigInput as AgentConfig,
  AgentDTO,
  AgentVersionDTO,
  CreateAgentRequest,
  FileDTO as File,
  InterruptDTO,
  ToolTypeClient,
  ToolInvocationStatusAwaitingInput,
  ToolInvocationStatusInProgress,
  CursorListRequest,
  CursorListResponse,
} from '../types';
import { isChatBusy } from '../utils';

const terminalMessageStatuses = new Set([ChatMessageStatusReady, ChatMessageStatusFailed, ChatMessageStatusCancelled]);

/**
 * Decides when one sendMessage() turn is over.
 *
 * For an existing chat the stream/poll is opened before the POST so nothing is
 * missed, but its first snapshot is the previous turn's idle state. Resolving on
 * that made sendMessage return before the new run had started. An idle snapshot
 * only counts once the chat was seen busy, or once this turn's assistant message
 * reached a terminal status (runs that finish between two observations).
 */
class TurnGate {
  assistantMessageId: string | null = null;
  private sawBusy = false;
  private assistantDone = false;

  constructor(private readonly existingChat: boolean) {}

  observeChat(chat: ChatDTO): void {
    if (isChatBusy(chat)) this.sawBusy = true;
  }

  observeMessage(message: ChatMessageDTO): void {
    if (message.id === this.assistantMessageId && terminalMessageStatuses.has(message.status)) {
      this.assistantDone = true;
    }
  }

  /** Whether an idle observation may end the turn. */
  get settled(): boolean {
    return !this.existingChat || this.sawBusy || this.assistantDone;
  }
}

/** Internal tool definition returned by getInternalTools */
export interface InternalToolDefinition {
  id: string;
  name: string;
  description: string;
  tools: string[];
  scope: string;
  /** What this category resolves to when the agent's flag is unset. Opt-in
   * categories default false; render switches from this rather than assume. */
  default_enabled: boolean;
}

/** Options for creating an agent */
export interface AgentOptions {
  /** Optional name for the adhoc agent (used for deduplication and display) */
  name?: string;
  /** Per-chat context variables — resolved in call tool URL templates ({{context.X}}) */
  context?: Record<string, string>;
}

/**
 * One streamed token batch for a message, with everything received for that
 * message so far. `output.response` is the assistant text as it grows.
 */
export interface AgentDelta {
  /** The chat message the tokens belong to (normally this turn's assistant message) */
  messageId: string;
  /** This batch alone */
  delta: LLMDelta;
  /** All batches for the message merged, in the shape of the message's final output */
  output: LLMOutput;
  /** Producer sequence number, monotonically increasing per message */
  seq: number;
}

export interface SendMessageOptions {
  /** File attachments - Blob (will be uploaded) or FileDTO (already uploaded, has uri) */
  files?: (Blob | File)[];
  /** Callback for message updates */
  onMessage?: (message: ChatMessageDTO) => void;
  /** Callback for chat updates */
  onChat?: (chat: ChatDTO) => void;
  /**
   * Callback for token-by-token output while the assistant message is being
   * generated. Streaming mode only: with `stream: false` there are no deltas
   * and the message arrives whole through onMessage.
   */
  onDelta?: (delta: AgentDelta) => void;
  /** Callback when a client tool needs execution */
  onToolCall?: (invocation: { id: string; name: string; args: Record<string, unknown> }) => void;
  /** Use SSE streaming (true) or polling (false). Overrides client default. */
  stream?: boolean;
  /** Polling interval in ms when stream is false. Overrides client default. */
  pollIntervalMs?: number;
}

export interface AgentRunOptions extends Omit<SendMessageOptions, 'stream'> {
  /** Polling interval in ms (default: 2000) */
  pollIntervalMs?: number;
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
  private readonly context: Record<string, string> | undefined;
  private chatId: string | null = null;
  private stream: StreamableManager<unknown> | null = null;
  private poller: PollManager<ChatDTO> | null = null;
  private dispatchedToolCalls: Set<string> = new Set();

  /** @internal */
  constructor(http: HttpClient, files: FilesAPI, config: string | AgentConfig, options?: AgentOptions) {
    this.http = http;
    this.files = files;
    this.config = config;
    this.agentName = options?.name;
    this.context = options?.context;
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
    this.dispatchedToolCalls.clear();
    const isTemplate = typeof this.config === 'string';
    const hasCallbacks = !!(options.onMessage || options.onChat || options.onToolCall || options.onDelta);

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
        context: this.context,
        input: { text, images: imageUris, files: fileUris, role: 'user', context: [], system_prompt: '', context_size: 0 },
      }
      : {
        chat_id: this.chatId,
        agent_config: this.config as AgentConfig,
        agent_name: this.agentName ?? (this.config as AgentConfig).name,
        context: this.context,
        input: { text, images: imageUris, files: fileUris, role: 'user', context: [], system_prompt: '', context_size: 0 },
      };

    const useStream = options.stream ?? this.http.getStreamDefault();
    const shouldWait = useStream === false || hasCallbacks;
    const gate = new TurnGate(!!this.chatId);
    const waitFn = useStream === false
      ? (opts: SendMessageOptions) => this.pollUntilIdle(opts, gate)
      : (opts: SendMessageOptions) => this.streamUntilIdle(opts, gate);

    // For existing chats: Start waiting BEFORE POST so we don't miss updates
    let waitPromise: Promise<void> | null = null;
    if (this.chatId && shouldWait) {
      waitPromise = waitFn(options);
    }

    // Make the POST request
    let response: { user_message: ChatMessageDTO; assistant_message: ChatMessageDTO };
    try {
      const resp = await this.http.request<{ user_message: ChatMessageDTO; assistant_message: ChatMessageDTO }>(
        'post',
        '/agents/run',
        { data: body }
      );
      response = resp.data;
    } catch (err) {
      // Nothing to wait for; don't leave the pre-opened stream/poller running.
      if (waitPromise) this.disconnect();
      throw err;
    }
    gate.assistantMessageId = response.assistant_message?.id ?? null;

    // For new chats: Set chatId and start waiting immediately after POST
    const isNewChat = !this.chatId && response.assistant_message.chat_id;
    if (isNewChat) {
      this.chatId = response.assistant_message.chat_id;
      if (shouldWait) {
        waitPromise = waitFn(options);
      }
    }

    // Wait for completion
    if (waitPromise) {
      await waitPromise;
    }

    return { userMessage: response.user_message, assistantMessage: response.assistant_message };
  }

  /** Get chat by ID */
  async getChat(chatId?: string): Promise<ChatDTO | null> {
    const id = chatId || this.chatId;
    if (!id) return null;
    const resp = await this.http.request<ChatDTO>('get', `/chats/${id}`);
    return resp.data;
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

  /** Stop streaming/polling and cleanup */
  disconnect(): void {
    this.stream?.stop();
    this.stream = null;
    this.poller?.stop();
    this.poller = null;
  }

  /**
   * Run the agent and return structured output.
   *
   * Sends a message, waits for completion (always polls, no SSE), then returns
   * `chat.output` — the parsed finish tool result. Returns `null` if the agent
   * finished without calling the finish tool.
   */
  async run(text: string, options: AgentRunOptions = {}): Promise<any> {
    await this.sendMessage(text, { ...options, stream: false });
    const chat = await this.getChat();
    return chat?.output ?? null;
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
    this.streamUntilIdle(options, new TurnGate(false));
  }

  /** Stream events until chat becomes idle */
  private streamUntilIdle(options: SendMessageOptions, gate: TurnGate): Promise<void> {
    if (!this.chatId) return Promise.resolve();

    const { url, headers, credentials } = this.http.getStreamableConfig(`/chats/${this.chatId}/stream`);

    return new Promise((resolve, reject) => {
      this.stream?.stop();

      this.stream = new StreamableManager<unknown>({
        url,
        headers,
        credentials,
        onError: (err) => reject(err),
        // Stream ended without an idle observation (server closed early or max
        // reconnects exhausted). Resolve so sendMessage does not hang; the
        // caller may not have seen a clean turn-end state, but hanging is worse.
        onEnd: () => resolve(),
      });

      // Last chat/run observation was idle but the gate wasn't settled yet;
      // a terminal message for this turn can settle it.
      let idlePending = false;
      const onIdle = () => {
        if (gate.settled) resolve();
        else idlePending = true;
      };

      this.stream.addEventListener<ChatDTO>('chats', (chat) => {
        options.onChat?.(chat);
        gate.observeChat(chat);
        if (!isChatBusy(chat)) onIdle();
        else idlePending = false;
      });

      this.stream.addEventListener<AgentRunDTO>('agent_runs', (run) => {
        const asChat = { active_run: run } as ChatDTO;
        options.onChat?.(asChat);
        gate.observeChat(asChat);
        if (!isChatBusy(asChat)) onIdle();
        else idlePending = false;
      });

      // One accumulator per message being streamed, keyed by the message id
      // the delta names, so a tool-call-only turn never shows the previous
      // message's text. Same attribution rule as the React hooks.
      const deltaAccums = new Map<string, DeltaAccumulator>();

      this.stream.addEventListener<DeltaEvent>('delta', (evt) => {
        if (!options.onDelta || !evt?.delta || !evt.resource_id) return;
        let accum = deltaAccums.get(evt.resource_id);
        if (!accum) {
          accum = createLLMDeltaAccumulator();
          deltaAccums.set(evt.resource_id, accum);
        }
        accum.apply(evt.delta);
        options.onDelta({
          messageId: evt.resource_id,
          delta: evt.delta as LLMDelta,
          output: accum.toOutput() as LLMOutput,
          seq: evt.seq,
        });
      });

      this.stream.addEventListener<ChatMessageDTO>('chat_messages', (message) => {
        // A terminal message receives no further deltas.
        if (terminalMessageStatuses.has(message.status)) deltaAccums.delete(message.id);
        gate.observeMessage(message);
        options.onMessage?.(message);
        if (idlePending && gate.settled) resolve();

        if (message.tool_invocations && options.onToolCall) {
          for (const inv of message.tool_invocations) {
            if (this.dispatchedToolCalls.has(inv.id)) continue;

            if (inv.type === ToolTypeClient && (inv.status === ToolInvocationStatusInProgress || inv.status === ToolInvocationStatusAwaitingInput)) {
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

      this.stream.start();
    });
  }

  /** Poll until chat becomes idle, dispatching callbacks on changes */
  private pollUntilIdle(options: SendMessageOptions, gate: TurnGate): Promise<void> {
    if (!this.chatId) return Promise.resolve();

    const intervalMs = options.pollIntervalMs ?? this.http.getPollIntervalMs();
    let prevStatus: string | null = null;
    let knownMessageIds = new Set<string>();

    return new Promise((resolve) => {
      this.poller?.stop();

      this.poller = new PollManager<ChatDTO>({
        pollFunction: async () => {
          // Lightweight status check first
          const statusResp = await this.http.request<ResourceStatusDTO>('get', `/chats/${this.chatId}/status`);
          const status = statusResp.data;
          // Unchanged status is skipped — unless the turn is still ungated: a run
          // that started and finished between two polls only shows in the messages.
          if (status.status === prevStatus && gate.settled) {
            // No change — return a stub to skip processing
            return { status: status.status } as ChatDTO;
          }
          // Status changed — fetch full chat
          const chatResp = await this.http.request<ChatDTO>('get', `/chats/${this.chatId}`);
          return chatResp.data;
        },
        intervalMs,
        onData: (chat) => {
          if ((chat as any).status === prevStatus && !(chat as any).chat_messages) return;
          prevStatus = chat.status;

          options.onChat?.(chat);
          gate.observeChat(chat);
          for (const message of chat.chat_messages ?? []) gate.observeMessage(message);

          // Dispatch new/updated messages
          if (chat.chat_messages && options.onMessage) {
            for (const message of chat.chat_messages) {
              if (!knownMessageIds.has(message.id)) {
                knownMessageIds.add(message.id);
                options.onMessage(message);
              } else {
                // Re-dispatch for potential updates
                options.onMessage(message);
              }

              // Handle client tool invocations
              if (message.tool_invocations && options.onToolCall) {
                for (const inv of message.tool_invocations) {
                  if (this.dispatchedToolCalls.has(inv.id)) continue;
                  if (inv.type === ToolTypeClient && (inv.status === ToolInvocationStatusInProgress || inv.status === ToolInvocationStatusAwaitingInput)) {
                    this.dispatchedToolCalls.add(inv.id);
                    options.onToolCall({
                      id: inv.id,
                      name: inv.function?.name || '',
                      args: inv.function?.arguments || {},
                    });
                  }
                }
              }
            }
          }

          if (!isChatBusy(chat) && gate.settled) {
            this.poller?.stop();
            this.poller = null;
            resolve();
          }
        },
        onError: (error) => {
          console.warn('[Agent] Poll error:', error);
        },
      });

      this.poller.start();
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
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<AgentDTO>>> {
    return this.http.request<CursorListResponse<AgentDTO>>('post', '/agents/list', { data: params });
  }

  /**
   * Get an agent template by ID
   */
  async get(agentId: string): Promise<Response<AgentDTO>> {
    return this.http.request<AgentDTO>('get', `/agents/${agentId}`);
  }

  /**
   * Create a new agent template or create a new version of an existing agent
   */
  async createAgent(data: CreateAgentRequest): Promise<Response<AgentDTO>> {
    return this.http.request<AgentDTO>('post', '/agents', { data });
  }

  /**
   * Update an agent template
   */
  async update(agentId: string, data: Partial<AgentDTO>): Promise<Response<AgentDTO>> {
    return this.http.request<AgentDTO>('post', `/agents/${agentId}`, { data });
  }

  /**
   * Delete an agent template
   */
  async delete(agentId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/agents/${agentId}`);
  }

  /**
   * Duplicate an agent template
   */
  async duplicate(agentId: string): Promise<Response<AgentDTO>> {
    return this.http.request<AgentDTO>('post', `/agents/${agentId}/duplicate`);
  }

  /**
   * List agent template versions
   */
  async listVersions(agentId: string, params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<AgentVersionDTO>>> {
    return this.http.request<CursorListResponse<AgentVersionDTO>>('post', `/agents/${agentId}/versions/list`, { data: params });
  }

  /**
   * Transfer agent ownership to another team
   */
  async transferOwnership(agentId: string, newTeamId: string): Promise<Response<AgentDTO>> {
    return this.http.request<AgentDTO>('post', `/agents/${agentId}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Update agent visibility
   */
  async updateVisibility(agentId: string, visibility: string): Promise<Response<AgentDTO>> {
    return this.http.request<AgentDTO>('post', `/agents/${agentId}/visibility`, { data: { visibility } });
  }

  /**
   * Get a specific agent version
   */
  async getVersion(agentId: string, versionId: string): Promise<Response<AgentVersionDTO>> {
    return this.http.request<AgentVersionDTO>('get', `/agents/${agentId}/versions/${versionId}`);
  }

  /**
   * Get an agent by namespace/name (e.g., "inference/my-agent")
   */
  async getByName(namespace: string, name: string): Promise<Response<AgentDTO>> {
    return this.http.request<AgentDTO>('get', `/agents/${namespace}/${name}`);
  }

  /**
   * Get internal tools for the agent
   */
  async getInternalTools(): Promise<Response<InternalToolDefinition[]>> {
    return this.http.request<InternalToolDefinition[]>('get', '/agents/internal-tools');
  }

  /**
   * Get A2A protocol agent card for an agent.
   * Returns raw JSON (not wrapped in {data:...}) for direct upload to GCP Producer Portal.
   * Spec: https://a2a-protocol.org/latest/specification/
   */
  async getA2ACard(agentId: string): Promise<Response<Record<string, unknown>>> {
    return this.http.request<Record<string, unknown>>('get', `/agents/${agentId}/card`);
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

  /**
   * Resolve an interrupt gate on an agent run
   */
  async resolveInterrupt(interruptId: string, decision: 'allow' | 'deny'): Promise<Response<InterruptDTO>> {
    return this.http.request<InterruptDTO>('post', `/interrupts/${interruptId}/resolve`, {
      data: { decision }
    });
  }

  /**
   * List pending interrupts for an agent run
   */
  async listRunInterrupts(runId: string): Promise<Response<InterruptDTO[]>> {
    return this.http.request<InterruptDTO[]>('get', `/agent-runs/${runId}/interrupts`);
  }
}

export function createAgentsAPI(http: HttpClient, files: FilesAPI): AgentsAPI {
  return new AgentsAPI(http, files);
}
