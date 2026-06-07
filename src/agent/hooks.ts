/**
 * Agent Chat Hooks
 *
 * React hooks for accessing chat state and actions.
 */

import { useContext } from 'react';
import { AgentChatContext } from './context';
import type { AgentChatState, AgentChatActions, ChatMessageDTO, AgentClient } from './types';

/**
 * Hook to access chat state
 *
 * @returns Chat state (messages, status, isGenerating, etc.)
 * @throws Error if used outside AgentChatProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { messages, isGenerating, status } = useAgentChat();
 *   return <div>{messages.length} messages</div>;
 * }
 * ```
 */
export function useAgentChat(): AgentChatState {
  const context = useContext(AgentChatContext);

  if (!context) {
    throw new Error(
      'useAgentChat must be used within an AgentChatProvider. ' +
      'Wrap your component tree with <AgentChatProvider>.'
    );
  }

  return context.state;
}

/**
 * Hook to access chat actions
 *
 * @returns Chat actions (sendMessage, stopGeneration, reset)
 * @throws Error if used outside AgentChatProvider
 *
 * @example
 * ```tsx
 * function SendButton() {
 *   const { sendMessage, stopGeneration } = useAgentActions();
 *   const { isGenerating } = useAgentChat();
 *
 *   return (
 *     <button onClick={() => isGenerating ? stopGeneration() : sendMessage('Hello!')}>
 *       {isGenerating ? 'Stop' : 'Send'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useAgentActions(): AgentChatActions {
  const context = useContext(AgentChatContext);

  if (!context) {
    throw new Error(
      'useAgentActions must be used within an AgentChatProvider. ' +
      'Wrap your component tree with <AgentChatProvider>.'
    );
  }

  return context.actions;
}

/**
 * Hook to access a specific message by ID
 *
 * @param messageId The message ID to find
 * @returns The message or undefined if not found
 *
 * @example
 * ```tsx
 * function MessageDetail({ messageId }: { messageId: string }) {
 *   const message = useMessage(messageId);
 *   if (!message) return null;
 *   return <div>{message.content}</div>;
 * }
 * ```
 */
export function useMessage(messageId: string): ChatMessageDTO | undefined {
  const { messages } = useAgentChat();
  return messages.find((m) => m.id === messageId);
}

/**
 * Hook to access both state and actions in one call
 *
 * @returns Object containing both state and actions
 *
 * @example
 * ```tsx
 * function ChatInput() {
 *   const { state, actions } = useAgentChatContext();
 *   const [input, setInput] = useState('');
 *
 *   return (
 *     <form onSubmit={() => actions.sendMessage(input)}>
 *       <input value={input} onChange={e => setInput(e.target.value)} />
 *       <button disabled={state.isGenerating}>Send</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useAgentChatContext(): { state: AgentChatState; actions: AgentChatActions } {
  const context = useContext(AgentChatContext);

  if (!context) {
    throw new Error(
      'useAgentChatContext must be used within an AgentChatProvider. ' +
      'Wrap your component tree with <AgentChatProvider>.'
    );
  }

  return context;
}

/**
 * Hook to access the agent client
 *
 * @returns The AgentClient instance from the provider
 * @throws Error if used outside AgentChatProvider
 *
 * @example
 * ```tsx
 * function TaskViewer({ taskId }: { taskId: string }) {
 *   const client = useAgentClient();
 *   return <TaskOutputWrapper client={client} taskId={taskId} />;
 * }
 * ```
 */
export function useAgentClient(): AgentClient {
  const context = useContext(AgentChatContext);

  if (!context) {
    throw new Error(
      'useAgentClient must be used within an AgentChatProvider. ' +
      'Wrap your component tree with <AgentChatProvider>.'
    );
  }

  return context.client;
}
