/**
 * Agent Chat Context
 *
 * React Context for sharing chat state and actions.
 */

import { createContext } from 'react';
import type { AgentChatState, AgentChatActions, AgentClient } from './types';

/**
 * Context value combining state, actions, and client
 */
export interface AgentChatContextValue {
  state: AgentChatState;
  actions: AgentChatActions;
  client: AgentClient;
}

/**
 * The main context for agent chat
 */
export const AgentChatContext = createContext<AgentChatContextValue | null>(null);

AgentChatContext.displayName = 'AgentChatContext';
