// HTTP utilities
export { HttpClient, HttpClientConfig, createHttpClient } from './http/client';
export { StreamManager, StreamManagerOptions, PartialDataWrapper } from './http/stream';
export { InferenceError, RequirementsNotMetException } from './http/errors';

// API modules
export { TasksAPI, RunOptions } from './api/tasks';
export { FilesAPI, UploadFileOptions } from './api/files';
export { AgentsAPI, Agent, AgentOptions, SendMessageOptions } from './api/agents';

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

  constructor(config: InferenceConfig | HttpClientConfig) {
    // Handle both simple config and full HttpClientConfig
    this.http = new HttpClient({
      apiKey: 'apiKey' in config ? config.apiKey : undefined,
      baseUrl: config.baseUrl,
      proxyUrl: config.proxyUrl,
      getToken: 'getToken' in config ? config.getToken : undefined,
      headers: 'headers' in config ? config.headers : undefined,
      credentials: 'credentials' in config ? config.credentials : undefined,
    });
    this.files = new FilesAPI(this.http);
    this.tasks = new TasksAPI(this.http);
    this.agents = new AgentsAPI(this.http, this.files);
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
