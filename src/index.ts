// HTTP utilities
export { HttpClient, HttpClientConfig, ErrorHandler, createHttpClient } from './http/client';
export { StreamManager, StreamManagerOptions, PartialDataWrapper } from './http/stream';
export { PollManager, PollManagerOptions } from './http/poll';
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
} from './http/errors';

// API modules
export { TasksAPI, RunOptions } from './api/tasks';
export { FilesAPI, UploadFileOptions } from './api/files';
export { AgentsAPI, Agent, AgentOptions, SendMessageOptions, AgentRunOptions } from './api/agents';
export { SessionsAPI } from './api/sessions';
export { AppsAPI } from './api/apps';
export { ChatsAPI } from './api/chats';
export { FlowsAPI } from './api/flows';
export { FlowRunsAPI } from './api/flow-runs';
export { EnginesAPI } from './api/engines';

// Tool Builder (fluent API)
export {
  tool,
  appTool,
  agentTool,
  webhookTool,
  internalTools,
  string,
  number,
  integer,
  boolean,
  enumOf,
  object,
  array,
  optional,
} from './tool-builder';
export type { ClientTool, ClientToolHandler } from './tool-builder';

// Types - includes TaskStatus constants and all DTOs
export * from './types';

// Convenience type alias
export type { TaskDTO as Task } from './types';

// =============================================================================
// Main Client
// =============================================================================

import { HttpClient, HttpClientConfig } from './http/client';
import { TasksAPI, RunOptions } from './api/tasks';
import { FilesAPI, UploadFileOptions } from './api/files';
import { AgentsAPI, Agent, AgentOptions } from './api/agents';
import { SessionsAPI } from './api/sessions';
import { AppsAPI } from './api/apps';
import { ChatsAPI } from './api/chats';
import { FlowsAPI } from './api/flows';
import { FlowRunsAPI } from './api/flow-runs';
import { EnginesAPI } from './api/engines';
import { ApiAppRunRequest, TaskDTO as Task, AgentConfig, File } from './types';

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
  }

  // Legacy methods for backward compatibility

  /** @internal */
  async _request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    options: { params?: Record<string, unknown>; data?: Record<string, unknown> } = {}
  ): Promise<T> {
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
   * Upload a file
   */
  async uploadFile(data: string | Blob, options: UploadFileOptions = {}): Promise<File> {
    return this.files.upload(data, options);
  }

  /**
   * Cancel a running task
   */
  async cancel(taskId: string): Promise<void> {
    return this.tasks.cancel(taskId);
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<Task> {
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
