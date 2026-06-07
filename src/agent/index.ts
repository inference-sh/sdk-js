/**
 * Agent Chat Module
 *
 * React components and hooks for building agent chat UIs.
 *
 * @example
 * ```tsx
 * import { inference } from '@inferencesh/sdk';
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
 *   const { messages, isGenerating } = useAgentChat();
 *   const { sendMessage, stopGeneration } = useAgentActions();
 *
 *   return (
 *     <div>
 *       {messages.map(m => <Message key={m.id} message={m} />)}
 *       <input onSubmit={(text) => sendMessage(text)} />
 *       {isGenerating && <button onClick={stopGeneration}>Stop</button>}
 *     </div>
 *   );
 * }
 * ```
 */

// Provider
export { AgentChatProvider } from './provider';

// Hooks
export {
  useAgentChat,
  useAgentActions,
  useAgentClient,
  useAgentChatContext,
  useMessage,
} from './hooks';

// Context (for advanced use cases)
export { AgentChatContext, type AgentChatContextValue } from './context';

// Types
export type {
  // Client interface
  AgentClient,
  UploadedFile,
  // Configuration
  AdHocAgentConfig,
  TemplateAgentConfig,
  AgentOptions,
  // State
  AgentChatState,
  AgentChatActions,
  ChatStatus,
  // Props
  AgentChatProviderProps,
  // Client tools
  ClientTool,
  ClientToolHandlerFn,
  // Re-exported from main types
  ChatMessageDTO,
  ChatDTO,
  ToolInvocationDTO,
  ChatMessageContent,
  ChatMessageRole,
} from './types';

// Type guards and helpers
export {
  isAdHocConfig,
  isTemplateConfig,
  isClientTool,
  extractToolSchemas,
  extractClientToolHandlers,
} from './types';
