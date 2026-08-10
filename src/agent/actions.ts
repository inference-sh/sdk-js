/**
 * Agent Chat Actions
 *
 * Action creators that handle side effects (API calls, streaming).
 * These are created once per provider instance with access to dispatch.
 */

import type { AgentRunDTO, ChatDTO, ChatMessageDTO, ResourceStatusDTO } from '../types';
import {
  ToolInvocationStatusAwaitingInput,
  ToolInvocationStatusInProgress,
  ToolTypeClient,
} from '../types';
import { isChatBusy } from '../utils';
import { StreamableManager } from '../http/streamable';
import { PollManager } from '../http/poll';
import type {
  AgentChatActions,
  ActionsContext,
  ActionsResult,
  InternalActions,
  FileRef,
} from './types';
import { isAdHocConfig, extractClientToolHandlers } from './types';
import * as api from './api';

// =============================================================================
// Action Creators
// =============================================================================

export function createActions(ctx: ActionsContext): ActionsResult {
  const dispatchedToolInvocations = new Set<string>();
  const { client, dispatch, getState, getConfig, getChatId, getClientToolHandlers, getStreamManager, setStreamManager, getStreamEnabled, getPollIntervalMs, callbacks } = ctx;

  let prevChatWasBusy = false;

  const checkTurnEnd = (chat: ChatDTO) => {
    const busy = isChatBusy(chat);
    if (prevChatWasBusy && !busy) {
      callbacks.onTurnEnd?.(chat);
    }
    prevChatWasBusy = busy;
  };

  // =========================================================================
  // Internal helpers
  // =========================================================================

  const setChat = (chat: ChatDTO | null) => {
    dispatch({ type: 'SET_CHAT', payload: chat });
    if (chat) {
      callbacks.onStatusChange?.(isChatBusy(chat) ? 'streaming' : 'idle');
      checkTurnEnd(chat);
    }
  };

  const updateMessage = (message: ChatMessageDTO, fields?: string[]) => {
    const chatId = getChatId();
    // TODO: remove startsWith once the provider normalizes chatId to full ID after first fetchChat
    // Support short ID matching (URL short IDs are prefixes of full IDs)
    if (chatId && message.chat_id && message.chat_id !== chatId && !message.chat_id.startsWith(chatId)) return;

    dispatch({ type: 'UPDATE_MESSAGE', payload: message, partial: fields ? true : undefined });

    // Dispatch client tool handlers when ready (in_progress or awaiting_input for backwards compat)
    const clientToolHandlers = getClientToolHandlers();
    if (message.tool_invocations && chatId && clientToolHandlers.size > 0) {
      for (const invocation of message.tool_invocations) {
        if (
          invocation.type === ToolTypeClient &&
          (invocation.status === ToolInvocationStatusInProgress || invocation.status === ToolInvocationStatusAwaitingInput)
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
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
    callbacks.onStatusChange?.('connecting');

    try {
      // Fetch initial chat (fetchChat loads messages separately since Chat.Get no longer preloads them)
      const chat = await api.fetchChat(client, id);
      if (chat) {
        setChat(chat);
      }
    } catch (error) {
      console.error('[AgentSDK] Failed to fetch chat:', error);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'idle' });
      callbacks.onStatusChange?.('idle');
      return;
    }

    if (!getStreamEnabled()) {
      // Polling mode
      pollChat(id);
      return;
    }

    // Single unified stream with TypedEvents (both Chat and ChatMessage events)
    const { url, headers, credentials } = api.getChatStreamConfig(client, id);
    const manager = new StreamableManager<unknown>({
      url,
      headers,
      credentials,
      onError: (error) => {
        console.warn('[AgentSDK] Stream error:', error);
        callbacks.onError?.(error);
      },
      onStart: () => {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'streaming' });
        callbacks.onStatusChange?.('streaming');
      },
      onEnd: () => {
        // Only reset if this is an unexpected stop (stream died, max reconnects exhausted).
        // If stopStream() was called intentionally, it clears the manager ref first,
        // so getStreamManager() will be undefined and we skip the duplicate dispatch.
        if (getStreamManager()) {
          setStreamManager(undefined);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'idle' });
          callbacks.onStatusChange?.('idle');
        }
      },
    });

    // Listen for Chat object updates (status changes only — don't replace messages)
    manager.addEventListener<ChatDTO>('chats', (chatData) => {
      dispatch({ type: 'UPDATE_CHAT', payload: chatData });
      if (chatData) {
        callbacks.onStatusChange?.(isChatBusy(chatData) ? 'streaming' : 'idle');
        checkTurnEnd(chatData);
      }
    });

    // Listen for ChatMessage updates
    manager.addEventListener<ChatMessageDTO>('chat_messages', (message, fields) => {
      updateMessage(message, fields);
    });

    // Listen for AgentRun updates (state transitions, output)
    manager.addEventListener<AgentRunDTO>('agent_runs', (run) => {
      dispatch({ type: 'UPDATE_ACTIVE_RUN', payload: run });
      const asChat = { active_run: run } as ChatDTO;
      callbacks.onStatusChange?.(isChatBusy(asChat) ? 'streaming' : 'idle');
      checkTurnEnd(asChat);
    });

    setStreamManager(manager);
    manager.start();
  };

  /** Poll-based alternative to streaming for restricted environments */
  const pollChat = (id: string) => {
    let prevStatus: string | null = null;

    const manager = new PollManager<ResourceStatusDTO>({
      pollFunction: async () => {
        const resp = await client.http.request<ResourceStatusDTO>('get', `/chats/${id}/status`);
        return resp.data;
      },
      intervalMs: getPollIntervalMs(),
      onData: async (statusData) => {
        if (statusData.status === prevStatus) return;
        prevStatus = statusData.status as string;

        // Status changed — fetch chat (fetchChat loads messages)
        try {
          const chat = await api.fetchChat(client, id);
          if (chat) {
            setChat(chat);
            if (chat.chat_messages) {
              for (const message of chat.chat_messages) {
                updateMessage(message);
              }
            }
          }
        } catch (err) {
          console.warn('[AgentSDK] Poll fetch error:', err);
          callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      },
      onStart: () => {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'streaming' });
        callbacks.onStatusChange?.('streaming');
      },
      onStop: () => {
        if (getStreamManager()) {
          setStreamManager(undefined);
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'idle' });
          callbacks.onStatusChange?.('idle');
        }
      },
      onError: (error) => {
        console.warn('[AgentSDK] Poll error:', error);
        callbacks.onError?.(error);
      },
    });

    setStreamManager(manager);
    manager.start();
  };

  const stopStream = () => {
    const manager = getStreamManager();
    // Clear ref first so onStop callback (from manager.stop) is a no-op
    setStreamManager(undefined);
    if (manager) {
      manager.stop();
    }
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'idle' });
    callbacks.onStatusChange?.('idle');
  };

  // =========================================================================
  // Public Actions
  // =========================================================================

  const publicActions: AgentChatActions = {
    sendMessage: async (text: string, files?: FileRef[]) => {
      const agentConfig = getConfig();
      const chatId = getChatId();

      if (!agentConfig) {
        console.error('[AgentSDK] No agent config provided');
        return;
      }

      const trimmedText = text.trim();
      if (!trimmedText) return;

      dispatchedToolInvocations.clear();

      // Update status
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'streaming' });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      try {
        const result = await api.sendMessage(client, agentConfig, chatId, trimmedText, files);

        if (result) {
          const { chatId: newChatId, userMessage } = result;

          // Add user message from POST response immediately
          if (userMessage) dispatch({ type: 'UPDATE_MESSAGE', payload: userMessage });

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
        } else {
          // API returned no result — reset status so we don't get stuck
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'idle' });
          callbacks.onStatusChange?.('idle');
        }
      } catch (error) {
        console.error('[AgentSDK] Failed to send message:', error);
        const err = error instanceof Error ? error : new Error('Failed to send message');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
      }
    },

    uploadFile: async (file: File) => {
      return api.uploadFile(client, file);
    },

    stopGeneration: () => {
      const chatId = getChatId();
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
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'idle' });
    },

    submitToolResult: async (toolInvocationId: string, result: string) => {
      try {
        await api.submitToolResult(client, toolInvocationId, result);
      } catch (error) {
        console.error('[AgentSDK] Failed to submit tool result:', error);
        const err = error instanceof Error ? error : new Error('Failed to submit tool result');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
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
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
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
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
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
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    cancelMessage: async (messageId: string) => {
      try {
        await api.cancelMessage(client, messageId);
      } catch (error) {
        console.error('[AgentSDK] Failed to cancel message:', error);
        const err = error instanceof Error ? error : new Error('Failed to cancel message');
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    loadOlderMessages: async () => {
      const chatId = getChatId();
      const cursor = getState().messageCursor;
      if (!chatId || !cursor) return false;

      const page = await api.fetchMessagesPage(client, chatId, { cursor });
      if (page.items.length > 0) {
        dispatch({
          type: 'PREPEND_MESSAGES',
          payload: { messages: page.items, cursor: page.next_cursor, hasMore: page.has_next },
        });
      }
      return page.has_next;
    },

    get hasOlderMessages() {
      return getState().hasOlderMessages ?? false;
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
