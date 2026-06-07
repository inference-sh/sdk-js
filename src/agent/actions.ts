/**
 * Agent Chat Actions
 *
 * Action creators that handle side effects (API calls, streaming).
 * These are created once per provider instance with access to dispatch.
 */

import type { ChatDTO, ChatMessageDTO } from '../types';
import {
  ToolInvocationStatusAwaitingInput,
  ToolTypeClient,
} from '../types';
import { StreamManager } from '../http/stream';
import type {
  AgentChatActions,
  ActionsContext,
  ActionsResult,
  InternalActions,
  UploadedFile,
} from './types';
import { isAdHocConfig, extractClientToolHandlers } from './types';
import * as api from './api';

// =============================================================================
// Track dispatched client tool invocations to prevent duplicates
// =============================================================================

const dispatchedToolInvocations = new Set<string>();

// =============================================================================
// Action Creators
// =============================================================================

export function createActions(ctx: ActionsContext): ActionsResult {
  const { client, dispatch, getConfig, getChatId, getClientToolHandlers, getStreamManager, setStreamManager, callbacks } = ctx;

  // =========================================================================
  // Internal helpers
  // =========================================================================

  const setChat = (chat: ChatDTO | null) => {
    dispatch({ type: 'SET_CHAT', payload: chat });
    if (chat) {
      const status = chat.status === 'busy' ? 'streaming' : 'idle';
      callbacks.onStatusChange?.(status);
    }
  };

  const updateMessage = (message: ChatMessageDTO) => {
    const chatId = getChatId();
    if (message.chat_id !== chatId) return;

    dispatch({ type: 'UPDATE_MESSAGE', payload: message });

    // Check for client tool invocations that need execution
    const clientToolHandlers = getClientToolHandlers();
    if (message.tool_invocations && chatId && clientToolHandlers.size > 0) {
      for (const invocation of message.tool_invocations) {
        if (
          invocation.type === ToolTypeClient &&
          invocation.status === ToolInvocationStatusAwaitingInput
        ) {
          // Skip if already dispatched
          if (dispatchedToolInvocations.has(invocation.id)) {
            continue;
          }
          dispatchedToolInvocations.add(invocation.id);

          const functionName = invocation.function?.name || '';
          const handler = clientToolHandlers.get(functionName);

          if (!handler) {
            console.warn(`[AgentSDK] No handler for client tool: ${functionName}`);
            api.submitToolResult(client, invocation.id, JSON.stringify({
              status: 'not_available',
              message: `Client tool "${functionName}" is not available in this environment`,
            }));
            continue;
          }

          // Execute the handler (it captures any needed state via closure)
          // Use Promise.resolve to handle both sync and async handlers
          const args = invocation.function?.arguments || {};
          Promise.resolve(handler(args))
            .then((result: string) => {
              api.submitToolResult(client, invocation.id, result);
            })
            .catch((error: unknown) => {
              console.error(`[AgentSDK] Client tool ${functionName} error:`, error);
              api.submitToolResult(client, invocation.id, JSON.stringify({
                error: String(error)
              }));
            });
        }
      }
    }
  };

  const streamChat = async (id: string) => {
    const existingManager = getStreamManager();
    if (existingManager) {
      existingManager.stop();
    }

    setStreamManager(undefined);
    dispatch({ type: 'SET_STATUS', payload: 'connecting' });
    callbacks.onStatusChange?.('connecting');

    // Fetch initial chat
    const chat = await api.fetchChat(client, id);
    if (chat) {
      setChat(chat);
    }

    // Single unified stream with TypedEvents (both Chat and ChatMessage events)
    const manager = new StreamManager<unknown>({
      createEventSource: () => api.createUnifiedStream(client, id),
      autoReconnect: true,
      maxReconnects: 3,
      reconnectDelayMs: 3000,
      onError: (error) => {
        console.warn('[AgentSDK] Stream error:', error);
        callbacks.onError?.(error);
      },
      onStart: () => {
        dispatch({ type: 'SET_STATUS', payload: 'streaming' });
        callbacks.onStatusChange?.('streaming');
      },
    });

    // Listen for Chat object updates (status changes)
    manager.addEventListener<ChatDTO>('chats', (chatData) => {
      setChat(chatData);
    });

    // Listen for ChatMessage updates
    manager.addEventListener<ChatMessageDTO>('chat_messages', (message) => {
      updateMessage(message);
    });

    setStreamManager(manager);
    manager.connect();
  };

  const stopStream = () => {
    const manager = getStreamManager();
    if (manager) {
      manager.stop();
    }
    setStreamManager(undefined);
    dispatch({ type: 'SET_STATUS', payload: 'idle' });
    dispatch({ type: 'SET_IS_GENERATING', payload: false });
    callbacks.onStatusChange?.('idle');
  };

  // =========================================================================
  // Public Actions
  // =========================================================================

  const publicActions: AgentChatActions = {
    sendMessage: async (text: string, files?: UploadedFile[]) => {
      const agentConfig = getConfig();
      const chatId = getChatId();

      if (!agentConfig) {
        console.error('[AgentSDK] No agent config provided');
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText) return;

      // Update status
      dispatch({ type: 'SET_STATUS', payload: 'streaming' });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const result = await api.sendMessage(client, agentConfig, chatId, trimmedText, files);

        if (result) {
          const { chatId: newChatId } = result;

          // Start streaming if not already connected
          const streamManager = getStreamManager();
          if (newChatId && !streamManager) {
            // Either new chat or stream was stopped - restart streaming
            if (!chatId) {
              dispatch({ type: 'SET_CHAT_ID', payload: newChatId });
              callbacks.onChatCreated?.(newChatId);
            }
            streamChat(newChatId);
          }
        }
      } catch (error) {
        console.error('[AgentSDK] Failed to send message:', error);
        const err = error instanceof Error ? error : new Error('Failed to send message');
        dispatch({ type: 'SET_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
      }
    },

    uploadFile: async (file: File) => {
      return api.uploadFile(client, file);
    },

    stopGeneration: () => {
      const chatId = getChatId();
      stopStream();
      if (chatId) {
        api.stopChat(client, chatId);
      }
    },

    reset: () => {
      stopStream();
      dispatchedToolInvocations.clear();
      dispatch({ type: 'RESET' });
    },

    clearError: () => {
      dispatch({ type: 'SET_ERROR', payload: undefined });
      dispatch({ type: 'SET_STATUS', payload: 'idle' });
    },

    submitToolResult: async (toolInvocationId: string, result: string) => {
      try {
        await api.submitToolResult(client, toolInvocationId, result);
      } catch (error) {
        console.error('[AgentSDK] Failed to submit tool result:', error);
        const err = error instanceof Error ? error : new Error('Failed to submit tool result');
        dispatch({ type: 'SET_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    approveTool: async (toolInvocationId: string) => {
      try {
        await api.approveTool(client, toolInvocationId);
      } catch (error) {
        console.error('[AgentSDK] Failed to approve tool:', error);
        const err = error instanceof Error ? error : new Error('Failed to approve tool');
        dispatch({ type: 'SET_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    rejectTool: async (toolInvocationId: string, reason?: string) => {
      try {
        await api.rejectTool(client, toolInvocationId, reason);
      } catch (error) {
        console.error('[AgentSDK] Failed to reject tool:', error);
        const err = error instanceof Error ? error : new Error('Failed to reject tool');
        dispatch({ type: 'SET_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    alwaysAllowTool: async (toolInvocationId: string, toolName: string) => {
      const chatId = getChatId();

      if (!chatId) {
        console.error('[AgentSDK] Cannot always-allow tool without a chatId');
        return;
      }

      try {
        await api.alwaysAllowTool(client, chatId, toolInvocationId, toolName);
      } catch (error) {
        console.error('[AgentSDK] Failed to always-allow tool:', error);
        const err = error instanceof Error ? error : new Error('Failed to always-allow tool');
        dispatch({ type: 'SET_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },
  };

  const internalActions: InternalActions = {
    streamChat,
    stopStream,
    setChatId: (newChatId: string | null) => {
      const currentChatId = getChatId();
      if (newChatId === currentChatId) return;

      if (!newChatId) {
        stopStream();
        dispatchedToolInvocations.clear();
        dispatch({ type: 'RESET' });
        return;
      }

      dispatch({ type: 'SET_CHAT_ID', payload: newChatId });
      streamChat(newChatId);
    },
  };

  return { publicActions, internalActions };
}

// =============================================================================
// Helper: Extract client tool handlers from config
// =============================================================================

export function getClientToolHandlers(config: import('./types').AgentOptions | null): Map<string, import('./types').ClientToolHandlerFn> {
  if (!config || !isAdHocConfig(config) || !config.tools) {
    return new Map();
  }
  return extractClientToolHandlers(config.tools);
}
