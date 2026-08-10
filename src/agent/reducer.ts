/**
 * Agent Chat Reducer
 *
 * Pure reducer for managing agent chat state.
 */

import type { ChatMessageDTO } from '../types';
import type { AgentChatState, ChatAction } from './types';

// =============================================================================
// Initial State
// =============================================================================

export const initialState: AgentChatState = {
  chatId: null,
  messages: [],
  connectionStatus: 'idle',
  error: undefined,
  chat: null,
};

// =============================================================================
// Reducer
// =============================================================================

export function chatReducer(state: AgentChatState, action: ChatAction): AgentChatState {
  switch (action.type) {
    case 'SET_CHAT_ID':
      return { ...state, chatId: action.payload };

    case 'SET_CHAT': {
      const chat = action.payload;
      if (!chat) {
        return { ...state, chat: null, messages: [], connectionStatus: 'idle' };
      }
      const messages = [...(chat.chat_messages || [])].sort((a, b) => a.order - b.order);
      return { ...state, chat, messages };
    }

    case 'UPDATE_CHAT': {
      // Update chat metadata without replacing messages
      const chat = action.payload;
      if (!chat) return state;
      return { ...state, chat };
    }

    case 'UPDATE_ACTIVE_RUN': {
      if (!state.chat) return state;
      return { ...state, chat: { ...state.chat, active_run: action.payload } };
    }

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'UPDATE_MESSAGE': {
      const message = action.payload;
      const existingIndex = state.messages.findIndex((m) => m.id === message.id);
      if (existingIndex !== -1) {
        const existing = state.messages[existingIndex];
        const updated = action.partial ? { ...existing, ...message } : message;
        if (existing === updated) return state;
        const newMessages = [...state.messages];
        newMessages[existingIndex] = updated;
        return { ...state, messages: newMessages };
      }
      if (action.partial) return state;
      return { ...state, messages: [...state.messages, message].sort((a, b) => a.order - b.order) };
    }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload].sort((a, b) => a.order - b.order),
      };

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}
