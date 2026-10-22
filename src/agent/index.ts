/**
 * Agent Chat Module
 *
 * React components and hooks for building agent chat UIs.
 *
 * @example
 * ```tsx
 * import { inference, isChatBusy } from '@inferencesh/sdk';
 * import {
 *   AgentChatProvider,
 *   useAgentChat,
 *   useAgentActions,
 * } from '@inferencesh/sdk/agent';
 *
 * const client = inference({ apiKey: 'your-api-key' });
 *
 * function App() {
 *   return (
 *     <AgentChatProvider
 *       client={client}
 *       agentConfig={{
 *         core_app: { ref: 'openrouter/claude-sonnet-4@abc123' },
 *         system_prompt: 'You are a helpful assistant.',
 *       }}
 *     >
 *       <ChatUI />
 *     </AgentChatProvider>
 *   );
 * }
 *
 * function ChatUI() {
 *   const { chat, messages } = useAgentChat();
 *   const { sendMessage, stopGeneration } = useAgentActions();
 *   const isBusy = isChatBusy(chat); // covers busy, waiting, and awaiting_input
 *
 *   return (
 *     <div>
 *       {messages.map(m => <Message key={m.id} message={m} />)}
 *       <input onSubmit={(text) => sendMessage(text)} />
 *       {isBusy && <button onClick={stopGeneration}>Stop</button>}
 *     </div>
 *   );
 * }
 * ```
 */

// Provider
export { AgentChatProvider } from './provider.js';

// Hooks
export {
  useAgentChat,
  useAgentActions,
  useAgentClient,
  useAgentChatContext,
  useMessage,
} from './hooks.js';

// Context (for advanced use cases)
export { AgentChatContext, type AgentChatContextValue } from './context.js';

// Types
export type {
  // Client interface
  AgentClient,
  FileRef,
  // Configuration
  AdHocAgentConfig,
  TemplateAgentConfig,
  AgentOptions,
  // State
  AgentChatState,
  AgentChatActions,
  AlwaysAllowChoice,
  ChatStatus,
  // Props
  AgentChatProviderProps,
  // Client tools
  ClientTool,
  ClientToolHandlerFn,
  ClientToolResult,
} from './types.js';

// Type guards and helpers
export {
  isAdHocConfig,
  isTemplateConfig,
  isClientTool,
  extractToolSchemas,
  extractClientToolHandlers,
} from './types.js';

// MCP input requests
export {
  MCPMethodElicitationCreate,
  parseMCPInputState,
  elicitParams,
  isURLElicitation,
  buildMCPInputResult,
  type MCPInputState,
  type ElicitRequestParams,
  type ElicitRequestedSchema,
  type ElicitPropertySchema,
} from './mcp-input.js';
