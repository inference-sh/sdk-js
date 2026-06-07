/**
 * Agent Chat Provider
 *
 * React provider for agent chat state management.
 * Uses React useReducer + Context pattern.
 */

import React, { useReducer, useRef, useEffect, useMemo } from 'react';
import { StreamManager } from '../http/stream';
import { AgentChatContext, type AgentChatContextValue } from './context';
import { chatReducer, initialState } from './reducer';
import { createActions, getClientToolHandlers } from './actions';
import type {
  AgentChatProviderProps,
  AgentOptions,
  ChatStatus,
  ClientToolHandlerFn,
  ActionsContext,
  ActionsResult,
} from './types';

/**
 * AgentChatProvider - Provides chat state and actions to children
 *
 * @example
 * ```tsx
 * import { inference } from '@inferencesh/sdk';
 * import { AgentChatProvider, useAgentChat, useAgentActions } from '@inferencesh/sdk/agent';
 *
 * const client = inference({ apiKey: 'your-api-key' });
 *
 * function App() {
 *   return (
 *     <AgentChatProvider
 *       client={client}
 *       agentConfig={{ core_app: { ref: 'openrouter/claude-sonnet-4@abc123' } }}
 *     >
 *       <MyChatUI />
 *     </AgentChatProvider>
 *   );
 * }
 * ```
 */
export function AgentChatProvider({
  client,
  agentConfig,
  chatId,
  onChatCreated,
  onStatusChange,
  onError,
  children,
}: AgentChatProviderProps) {
  // Core state via useReducer
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Refs for mutable values that actions need access to
  const configRef = useRef<AgentOptions | null>(agentConfig);
  const chatIdRef = useRef<string | null>(chatId ?? null);
  const streamManagerRef = useRef<StreamManager<unknown> | undefined>(undefined);
  const clientToolHandlersRef = useRef<Map<string, ClientToolHandlerFn>>(
    getClientToolHandlers(agentConfig)
  );
  const callbacksRef = useRef<{
    onChatCreated?: (chatId: string) => void;
    onStatusChange?: (status: ChatStatus) => void;
    onError?: (error: Error) => void;
  }>({ onChatCreated, onStatusChange, onError });

  // Keep refs in sync with props
  useEffect(() => {
    configRef.current = agentConfig;
    clientToolHandlersRef.current = getClientToolHandlers(agentConfig);
  }, [agentConfig]);

  useEffect(() => {
    callbacksRef.current = { onChatCreated, onStatusChange, onError };
  }, [onChatCreated, onStatusChange, onError]);

  // Keep chatIdRef synced with state
  useEffect(() => {
    chatIdRef.current = state.chatId;
  }, [state.chatId]);

  // Create actions once (they use refs internally)
  const actionsContext = useMemo<ActionsContext>(() => ({
    client,
    dispatch,
    getConfig: () => configRef.current,
    getChatId: () => chatIdRef.current,
    getClientToolHandlers: () => clientToolHandlersRef.current,
    getStreamManager: () => streamManagerRef.current,
    setStreamManager: (manager) => { streamManagerRef.current = manager; },
    callbacks: callbacksRef.current,
  }), [client]);

  // Re-bind callbacks when they change
  useEffect(() => {
    actionsContext.callbacks = callbacksRef.current;
  }, [actionsContext, onChatCreated, onStatusChange, onError]);

  const actionsResultRef = useRef<ActionsResult | null>(null);
  if (!actionsResultRef.current) {
    actionsResultRef.current = createActions(actionsContext);
  }
  const { publicActions, internalActions } = actionsResultRef.current;

  // Handle initial chatId or chatId changes
  useEffect(() => {
    if (chatId && chatId !== state.chatId) {
      internalActions.setChatId(chatId);
    }
  }, [chatId, state.chatId, internalActions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      internalActions.stopStream();
    };
  }, [internalActions]);

  const contextValue = useMemo<AgentChatContextValue>(() => ({
    state,
    actions: publicActions,
    client,
  }), [state, publicActions, client]);

  return (
    <AgentChatContext.Provider value={contextValue}>
      {children}
    </AgentChatContext.Provider>
  );
}

AgentChatProvider.displayName = 'AgentChatProvider';
