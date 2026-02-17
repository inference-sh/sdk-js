/**
 * Agent Chat Provider
 *
 * React provider for agent chat state management.
 * Uses React useReducer + Context pattern.
 */

import React, { useReducer, useRef, useEffect, useMemo } from 'react';
import type { UpdateManager } from './types';
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

function mergeHandlers(
  base: Map<string, ClientToolHandlerFn>,
  extra?: Map<string, ClientToolHandlerFn>,
): Map<string, ClientToolHandlerFn> {
  if (!extra || extra.size === 0) return base;
  const merged = new Map(base);
  for (const [k, v] of extra) merged.set(k, v);
  return merged;
}

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
  clientToolHandlers: extraHandlers,
  onChatCreated,
  onStatusChange,
  onError,
  stream,
  pollIntervalMs,
  children,
}: AgentChatProviderProps) {
  // Core state via useReducer
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Refs for mutable values that actions need access to
  const configRef = useRef<AgentOptions | null>(agentConfig);
  const chatIdRef = useRef<string | null>(chatId ?? null);
  const streamManagerRef = useRef<UpdateManager | undefined>(undefined);
  const streamRef = useRef<boolean | undefined>(stream);
  const pollIntervalMsRef = useRef<number | undefined>(pollIntervalMs);
  const clientToolHandlersRef = useRef<Map<string, ClientToolHandlerFn>>(
    mergeHandlers(getClientToolHandlers(agentConfig), extraHandlers)
  );
  const callbacksRef = useRef<{
    onChatCreated?: (chatId: string) => void;
    onStatusChange?: (status: ChatStatus) => void;
    onError?: (error: Error) => void;
  }>({ onChatCreated, onStatusChange, onError });

  // Keep refs in sync with props
  useEffect(() => {
    configRef.current = agentConfig;
    clientToolHandlersRef.current = mergeHandlers(getClientToolHandlers(agentConfig), extraHandlers);
  }, [agentConfig, extraHandlers]);

  useEffect(() => {
    callbacksRef.current = { onChatCreated, onStatusChange, onError };
  }, [onChatCreated, onStatusChange, onError]);

  useEffect(() => {
    streamRef.current = stream;
    pollIntervalMsRef.current = pollIntervalMs;
  }, [stream, pollIntervalMs]);

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
    getStreamEnabled: () => streamRef.current ?? client.http.getStreamDefault(),
    getPollIntervalMs: () => pollIntervalMsRef.current ?? client.http.getPollIntervalMs(),
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
