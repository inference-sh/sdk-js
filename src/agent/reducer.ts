/**
 * Agent Chat Reducer
 *
 * Pure reducer for managing agent chat state.
 */

import type { ChatDTO, ChatMessageDTO } from '../types';
import type { AgentChatState, ChatAction, ChatStatus } from './types';

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
      // Update chat metadata (e.g. status) without replacing messages
      const chat = action.payload;
      if (!chat) return state;
      return { ...state, chat };
    }

    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };

    case 'UPDATE_MESSAGE': {
      const message = action.payload;
      const existingIndex = state.messages.findIndex((m) => m.id === message.id);
      let newMessages: ChatMessageDTO[];
      if (existingIndex !== -1) {
        newMessages = [...state.messages];
        newMessages[existingIndex] = message;
      } else {
        newMessages = [...state.messages, message].sort((a, b) => a.order - b.order);
      }
      return { ...state, messages: newMessages };
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
