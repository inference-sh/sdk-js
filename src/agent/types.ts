/**
 * Agent SDK Types
 *
 * Public types for the Agent chat module.
 */

import type { Dispatch } from 'react';
import type {
  ChatDTO,
  ChatMessageDTO,
  ToolInvocationDTO,
  ChatMessageContent,
  ChatMessageRole,
  TaskStatus,
  AgentTool,
  AgentConfig as GeneratedAgentConfig,
  CoreAppConfig,
  File as FileDTO,
} from '../types';
import type { HttpClient } from '../http/client';
import type { StreamManager } from '../http/stream';

// =============================================================================
// Client Interface
// =============================================================================

/**
 * Minimal file interface returned by upload (just needs uri and content_type)
 */
export interface UploadedFile {
  uri: string;
  content_type?: string;
}

/**
 * Minimal client interface required by the agent module.
 * This allows extended clients (like the app client) to be used.
 */
export interface AgentClient {
  /** HTTP client for API requests */
  http: Pick<HttpClient, 'request' | 'createEventSource'>;
  /** Files API for uploads */
  files: {
    upload: (data: string | Blob | globalThis.File) => Promise<UploadedFile>;
  };
}

// Re-export types that consumers might need
export type {
  ChatMessageDTO,
  ChatDTO,
  ToolInvocationDTO,
  ChatMessageContent,
  ChatMessageRole,
  TaskStatus,
};

// =============================================================================
// Agent Configuration
// =============================================================================

/**
 * Configuration for an ad-hoc agent - extends generated AgentConfig
 * Adds support for ClientTool (browser-side tool handlers)
 */
export type AdHocAgentConfig = Omit<Partial<GeneratedAgentConfig>, 'tools' | 'core_app'> & {
  /** Core LLM app configuration (required for ad-hoc agents) */
  core_app: CoreAppConfig & { ref: string };
  /**
   * Tools configuration - accepts both server tools (AgentTool) and client tools (ClientTool).
   * Client tools include a handler that runs in the browser.
   */
  tools?: (AgentTool | ClientTool)[];
};

/**
 * Configuration referencing a saved agent template
 */
export interface TemplateAgentConfig {
  /** Agent reference: namespace/name@shortid */
  agent: string;
}

/**
 * Union type for agent configuration options
 */
export type AgentOptions = AdHocAgentConfig | TemplateAgentConfig;

/**
 * Type guard to check if config is ad-hoc
 */
export function isAdHocConfig(config: AgentOptions): config is AdHocAgentConfig {
  return 'core_app' in config && config.core_app !== undefined;
}

/**
 * Type guard to check if config is template-based
 */
export function isTemplateConfig(config: AgentOptions): config is TemplateAgentConfig {
  return 'agent' in config;
}

// =============================================================================
// Chat State
// =============================================================================

/**
 * Status of the chat
 */
export type ChatStatus = 'idle' | 'connecting' | 'streaming' | 'error';

/**
 * Public chat state exposed via context
 */
export interface AgentChatState {
  /** Current chat ID (null if no chat started) */
  chatId: string | null;
  /** Chat messages */
  messages: ChatMessageDTO[];
  /** Chat status */
  status: ChatStatus;
  /** Whether the agent is currently generating a response */
  isGenerating: boolean;
  /** Error message if status is 'error' */
  error?: string;
  /** The full chat object (if loaded) */
  chat: ChatDTO | null;
}

/**
 * Actions available for interacting with the chat
 */
export interface AgentChatActions {
  /** Send a message to the agent */
  sendMessage: (text: string, files?: File[]) => Promise<void>;
  /** Stop the current generation */
  stopGeneration: () => void;
  /** Reset the chat (start fresh) */
  reset: () => void;
  /** Clear the current error */
  clearError: () => void;
  /** Submit a tool result (for widgets/awaiting input) - usually called automatically by SDK */
  submitToolResult: (toolInvocationId: string, result: string) => Promise<void>;
  /** Approve a tool (for HIL approval - AwaitingApproval status) */
  approveTool: (toolInvocationId: string) => Promise<void>;
  /** Reject a tool (for HIL approval - AwaitingApproval status) */
  rejectTool: (toolInvocationId: string, reason?: string) => Promise<void>;
  /** Always allow a tool for this chat (approves + auto-approves future invocations) */
  alwaysAllowTool: (toolInvocationId: string, toolName: string) => Promise<void>;
}

// =============================================================================
// Provider Props
// =============================================================================

/**
 * Props for the AgentChatProvider
 */
export interface AgentChatProviderProps {
  /** Client instance (Inference or any compatible client) */
  client: AgentClient;
  /** Agent configuration (ad-hoc or template reference) */
  agentConfig: AgentOptions;
  /** Optional existing chat ID to continue */
  chatId?: string;
  /** Callback when a new chat is created */
  onChatCreated?: (chatId: string) => void;
  /** Callback when chat status changes */
  onStatusChange?: (status: ChatStatus) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Children */
  children: React.ReactNode;
}

// =============================================================================
// Client Tools
// =============================================================================

/**
 * Client tool handler function - takes args and returns a result (sync or async)
 */
export type ClientToolHandlerFn = (args: Record<string, unknown>) => Promise<string> | string;

/**
 * Client tool definition - combines schema with handler
 */
export interface ClientTool {
  /** Tool schema (sent to API) */
  schema: AgentTool;
  /** Handler function (executed client-side) */
  handler: ClientToolHandlerFn;
}

/**
 * Type guard to check if a tool is a client tool with handler
 */
export function isClientTool(tool: AgentTool | ClientTool): tool is ClientTool {
  return 'handler' in tool && 'schema' in tool;
}

/**
 * Extract just the schemas from a mixed array of tools
 */
export function extractToolSchemas(tools: (AgentTool | ClientTool)[]): AgentTool[] {
  return tools.map(t => isClientTool(t) ? t.schema : t);
}

/**
 * Extract client tool handlers as a map
 */
export function extractClientToolHandlers(
  tools: (AgentTool | ClientTool)[]
): Map<string, ClientToolHandlerFn> {
  const handlers = new Map<string, ClientToolHandlerFn>();
  for (const tool of tools) {
    if (isClientTool(tool)) {
      handlers.set(tool.schema.name, tool.handler);
    }
  }
  return handlers;
}

// =============================================================================
// Internal Types (for actions module)
// =============================================================================

/**
 * Reducer action types
 */
export type ChatAction =
  | { type: 'SET_CHAT_ID'; payload: string | null }
  | { type: 'SET_CHAT'; payload: ChatDTO | null }
  | { type: 'SET_MESSAGES'; payload: ChatMessageDTO[] }
  | { type: 'UPDATE_MESSAGE'; payload: ChatMessageDTO }
  | { type: 'ADD_MESSAGE'; payload: ChatMessageDTO }
  | { type: 'SET_STATUS'; payload: ChatStatus }
  | { type: 'SET_IS_GENERATING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'RESET' };

/**
 * Context for action creators
 */
export interface ActionsContext {
  client: AgentClient;
  dispatch: Dispatch<ChatAction>;
  getConfig: () => AgentOptions | null;
  getChatId: () => string | null;
  getClientToolHandlers: () => Map<string, ClientToolHandlerFn>;
  getStreamManager: () => StreamManager<unknown> | undefined;
  setStreamManager: (manager: StreamManager<unknown> | undefined) => void;
  callbacks: {
    onChatCreated?: (chatId: string) => void;
    onStatusChange?: (status: ChatStatus) => void;
    onError?: (error: Error) => void;
  };
}

/**
 * Internal actions not exposed in the public AgentChatActions interface
 */
export interface InternalActions {
  /** Stream messages for a chat ID */
  streamChat: (id: string) => void;
  /** Stop streaming and cleanup */
  stopStream: () => void;
  /** Set chatId and start streaming */
  setChatId: (newChatId: string | null) => void;
}

/**
 * Result from createActions
 */
export interface ActionsResult {
  publicActions: AgentChatActions;
  internalActions: InternalActions;
}
