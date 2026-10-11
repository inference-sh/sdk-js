// HTTP utilities
export { HttpClient, type HttpClientConfig, type ErrorHandler, type FailedRequest, type HttpFetchInit, type MessageHandler, createHttpClient } from './http/client.js';
export type { Response } from './http/response.js';
import type { Response } from './http/response.js';
export { StreamManager, type StreamManagerOptions, type PartialDataWrapper } from './http/stream.js';
export { StreamableManager, type StreamableManagerOptions, type StreamableSource, type StreamRequest, type StreamRequestInit, type StreamableMessage, streamable, streamableRaw } from './http/streamable.js';
export { PollManager, type PollManagerOptions } from './http/poll.js';
export { isLoopbackHost, isHttpsOrLoopback } from './http/loopback.js';
export {
  InferenceError,
  RequirementsNotMetException,
  SessionError,
  SessionNotFoundError,
  SessionExpiredError,
  SessionEndedError,
  WorkerLostError,
  // Type guards (use these instead of instanceof for reliability)
  isRequirementsNotMetException,
  isInferenceError,
  isSessionError,
} from './http/errors.js';

// API modules
export { TasksAPI, type RunOptions, type WatchOptions, type TaskWatch } from './api/tasks.js';
export { SocketsAPI, type SocketTarget, type OpenSocketOptions } from './api/sockets.js';
export { FilesAPI, type UploadFileOptions } from './api/files.js';
export { AgentsAPI, Agent, type AgentOptions, type SendMessageOptions, type AgentRunOptions, type AgentDelta } from './api/agents.js';
export { SessionsAPI } from './api/sessions.js';
export { AppsAPI } from './api/apps.js';
export { ChatsAPI } from './api/chats.js';
export { FlowsAPI } from './api/flows.js';
export { FlowRunsAPI } from './api/flow-runs.js';
export { EnginesAPI } from './api/engines.js';
export { KnowledgeAPI, SkillsAPI } from './api/knowledge.js';
export { ArtifactsAPI } from './api/artifacts.js';
export type {
  AgentUpdateBody,
  AppPatchBody,
  AppUpdateBody,
  ChatUpdateBody,
  EngineUpdateBody,
  FlowUpdateBody,
  FlowPatchBody,
  FlowViewportBody,
  ProjectWriteBody,
  KnowledgeUpdateBody,
  TeamUpdateBody,
  MCPServerUpdateBody,
} from './api/write-bodies.js';
export { TeamsAPI } from './api/teams.js';
export { SecretsAPI } from './api/secrets.js';
export { ApiKeysAPI } from './api/api-keys.js';
export { CredentialsAPI } from './api/credentials.js';
export { SearchAPI } from './api/search.js';
export { ProjectsAPI } from './api/projects.js';
export { MCPServersAPI } from './api/mcp-servers.js';

// Live: the socket of a stream task and the live fields of its schemas
export { LiveSession, accessUrl } from './live/session.js';
export type { LiveState, LiveEnd, LiveHandlers, LiveSessionOptions, LiveUpdate, WebSocketLike, WebSocketConstructor } from './live/session.js';
export { STREAM_FORMAT, CLEAR_KEY, ERROR_KEY, REDIAL_CODES } from './live/protocol.js';
export {
  isLiveField,
  parseMediaType,
  pcmFormat,
  splitLiveSchema,
  binaryLiveField,
  alternativeLabel,
  alternativeTag,
} from './live/schema.js';
export type { JsonSchema, MediaType, PCMFormat, LiveField } from './live/schema.js';

// Tool Builder (fluent API)
export {
  tool,
  appTool,
  agentTool,
  webhookTool,
  httpTool,
  callTool,
  mcpTool,
  internalTools,
  string,
  number,
  integer,
  boolean,
  enumOf,
  object,
  array,
  optional,
} from './tool-builder.js';
export type { ClientTool, ClientToolHandler } from './tool-builder.js';

// Hook Builder (fluent API)
export { lifecycleHook, learningHooks } from './hook-builder.js';
export type { LifecycleHookBuilder } from './hook-builder.js';

// Delta accumulator for streaming responses
export { DeltaAccumulator, createLLMDeltaAccumulator, type DeltaEvent, type FieldTags, type FieldTagsRegistry } from './delta.js';

// Status utilities (handle both int and string status values)
export {
  parseStatus,
  isTerminalStatus,
  isChatBusy,
  isAwaitingHuman,
  isRunTerminal,
  isRunInterrupted,
  isRunSettled,
  isRunWorking,
  isMessageTerminal,
  pendingApprovals,
} from './utils.js';
export type { PendingApproval } from './utils.js';

// Types - includes TaskStatus constants and all DTOs
export * from './types.js';

// Convenience type alias
export type { TaskDTO as Task } from './types.js';

// =============================================================================
// Main Client
// =============================================================================

import { HttpClient, type HttpClientConfig } from './http/client.js';
import { TasksAPI, RunOptions } from './api/tasks.js';
import { SocketsAPI } from './api/sockets.js';
import { LiveSession, type LiveHandlers } from './live/session.js';
import type { OpenSocketOptions } from './api/sockets.js';
import { FilesAPI, UploadFileOptions } from './api/files.js';
import { AgentsAPI, Agent, AgentOptions } from './api/agents.js';
import { SessionsAPI } from './api/sessions.js';
import { AppsAPI } from './api/apps.js';
import { ChatsAPI } from './api/chats.js';
import { FlowsAPI } from './api/flows.js';
import { FlowRunsAPI } from './api/flow-runs.js';
import { EnginesAPI } from './api/engines.js';
import { KnowledgeAPI, SkillsAPI } from './api/knowledge.js';
import { ArtifactsAPI } from './api/artifacts.js';
import { TeamsAPI } from './api/teams.js';
import { SecretsAPI } from './api/secrets.js';
import { ApiKeysAPI } from './api/api-keys.js';
import { CredentialsAPI } from './api/credentials.js';
import { SearchAPI } from './api/search.js';
import { ProjectsAPI } from './api/projects.js';
import { MCPServersAPI } from './api/mcp-servers.js';
import { ApiAppRunRequest, TaskDTO as Task, AgentConfigInput as AgentConfig, FileDTO as File } from './types.js';

export interface InferenceConfig {
  /** Your inference.sh API key (required unless using proxyUrl) */
  apiKey?: string;
  /** Custom API base URL (defaults to https://api.inference.sh) */
  baseUrl?: string;
  /**
   * Proxy URL for frontend apps.
   * When set, requests are routed through your proxy server to protect API keys.
   */
  proxyUrl?: string;
  /**
   * Use SSE streaming (true, default) or polling (false) for real-time updates.
   * Set to false for environments that can't maintain long-lived connections.
   */
  stream?: boolean;
  /**
   * Polling interval in milliseconds when stream is false (default: 2000).
   */
  pollIntervalMs?: number;
  /**
   * fetch() credentials mode. Defaults to 'omit' with an apiKey and 'include'
   * for proxyUrl / getToken flows that rely on cookies.
   */
  credentials?: RequestCredentials;
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
  readonly http: HttpClient;
  readonly tasks: TasksAPI;
  readonly files: FilesAPI;
  readonly agents: AgentsAPI;
  readonly sessions: SessionsAPI;
  readonly apps: AppsAPI;
  readonly chats: ChatsAPI;
  readonly flows: FlowsAPI;
  readonly flowRuns: FlowRunsAPI;
  readonly engines: EnginesAPI;
  readonly knowledge: KnowledgeAPI;
  readonly artifacts: ArtifactsAPI;
  readonly skills: SkillsAPI;
  readonly teams: TeamsAPI;
  readonly secrets: SecretsAPI;
  readonly apiKeys: ApiKeysAPI;
  readonly credentials: CredentialsAPI;
  readonly search: SearchAPI;
  readonly projects: ProjectsAPI;
  readonly mcpServers: MCPServersAPI;
  readonly sockets: SocketsAPI;

  constructor(config: InferenceConfig | HttpClientConfig) {
    // Handle both simple config and full HttpClientConfig
    this.http = new HttpClient({
      apiKey: 'apiKey' in config ? config.apiKey : undefined,
      baseUrl: config.baseUrl,
      proxyUrl: config.proxyUrl,
      getToken: 'getToken' in config ? config.getToken : undefined,
      headers: 'headers' in config ? config.headers : undefined,
      credentials: 'credentials' in config ? config.credentials : undefined,
      onError: 'onError' in config ? config.onError : undefined,
      onMessage: 'onMessage' in config ? config.onMessage : undefined,
      stream: 'stream' in config ? config.stream : undefined,
      pollIntervalMs: 'pollIntervalMs' in config ? config.pollIntervalMs : undefined,
    });
    this.files = new FilesAPI(this.http);
    this.tasks = new TasksAPI(this.http);
    this.agents = new AgentsAPI(this.http, this.files);
    this.sessions = new SessionsAPI(this.http);
    this.apps = new AppsAPI(this.http);
    this.chats = new ChatsAPI(this.http);
    this.flows = new FlowsAPI(this.http);
    this.flowRuns = new FlowRunsAPI(this.http);
    this.engines = new EnginesAPI(this.http);
    this.knowledge = new KnowledgeAPI(this.http);
    this.artifacts = new ArtifactsAPI(this.http);
    this.skills = new SkillsAPI(this.http);
    this.teams = new TeamsAPI(this.http);
    this.secrets = new SecretsAPI(this.http);
    this.apiKeys = new ApiKeysAPI(this.http);
    this.credentials = new CredentialsAPI(this.http);
    this.search = new SearchAPI(this.http);
    this.projects = new ProjectsAPI(this.http);
    this.mcpServers = new MCPServersAPI(this.http);
    this.sockets = new SocketsAPI(this.http, this.tasks);
  }

  // Legacy methods for backward compatibility

  /** @internal */
  async _request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    options: { params?: Record<string, unknown>; data?: Record<string, unknown> } = {}
  ): Promise<Response<T>> {
    return this.http.request<T>(method, endpoint, options);
  }

  /** @internal */
  _createEventSource(endpoint: string) {
    return this.http.createEventSource(endpoint);
  }

  /**
   * Run a task on inference.sh
   */
  async run(params: ApiAppRunRequest, options: RunOptions = {}): Promise<Task> {
    const processedInput = await this.files.processInput(params.input);
    return this.tasks.run(params, processedInput, options);
  }

  /**
   * Start a stream function and open its socket. The task runs until the
   * session is closed (or the app returns); `session.ended` settles then.
   *
   * @example
   * ```typescript
   * const { session } = await client.live({ app: 'infsh/voice-loop', function: 'stream', input: { effect: 'robot' } }, {
   *   onBinary: (pcm) => speaker.write(pcm),
   *   onPatch: (patch) => console.log(patch),
   * });
   * session.sendBinary(micFrame);
   * session.close();
   * ```
   */
  async live(
    params: ApiAppRunRequest,
    handlers: LiveHandlers = {},
    options: OpenSocketOptions = {}
  ): Promise<{ task: Task; session: LiveSession }> {
    const task = await this.run(params, { wait: false });
    const session = await this.sockets.open(task, handlers, options);
    return { task, session };
  }

  /**
   * Upload a file
   */
  async uploadFile(data: string | Blob, options: UploadFileOptions = {}): Promise<File> {
    return this.files.upload(data, options);
  }

  /**
   * Cancel a running task
   */
  async cancel(taskId: string): Promise<Response<void>> {
    return this.tasks.cancel(taskId);
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<Response<Task>> {
    return this.tasks.get(taskId);
  }

  /**
   * Create an EventSource for streaming task updates
   */
  streamTask(taskId: string) {
    return this.tasks.stream(taskId);
  }

  /**
   * Create an agent for chat interactions
   */
  agent(config: string | AgentConfig, options?: AgentOptions): Agent {
    return this.agents.create(config, options);
  }
}

/**
 * Factory function for creating an Inference client (simple config)
 */
export function inference(config: InferenceConfig): Inference {
  return new Inference(config);
}

/**
 * Create a client with extended configuration (for app integration)
 * Supports dynamic auth, custom headers, etc.
 */
export function createClient(config: HttpClientConfig): Inference {
  return new Inference(config);
}
