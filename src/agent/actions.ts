/**
 * Agent Chat Actions
 *
 * Action creators that handle side effects (API calls, streaming).
 * These are created once per provider instance with access to dispatch.
 */

import type { AgentRunDTO, ChatDTO, ChatMessageDTO, ChatSettingsRequest, DeltaEvent, ElicitResult, ResourceStatusDTO } from '../types.js';
import {
  ToolInvocationStatusAwaitingInput,
  ToolInvocationStatusInProgress,
  ToolTypeClient,
} from '../types.js';
import { approvalInterrupt, isChatBusy, isMessageTerminal, isRunInterrupted, isRunWorking } from '../utils.js';
import { StreamableManager } from '../http/streamable.js';
import { PollManager } from '../http/poll.js';
import { createLLMDeltaAccumulator, type DeltaAccumulator } from '../delta.js';
import type {
  AgentChatActions,
  AlwaysAllowChoice,
  ActionsContext,
  ActionsResult,
  InternalActions,
  FileRef,
  ClientToolResult,
} from './types.js';
import { isAdHocConfig, extractClientToolHandlers } from './types.js';
import * as api from './api.js';
import type { FetchChatResult } from './api.js';
import { buildMCPInputResult } from './mcp-input.js';
import { applyChatUpdate } from './reducer.js';
import { isInferenceError } from '../http/errors.js';

// =============================================================================
// Action Creators
// =============================================================================

/** Up to about ten minutes of backoff (1s doubling to 30s, jittered) before a tool result is given up. */
const TOOL_RESULT_MAX_ATTEMPTS = 25;

/** A failure a retry can get past: no response at all, a 5xx, a 408 or a 429. */
function isTransient(err: unknown): boolean {
  const status = (err as { statusCode?: unknown } | null)?.statusCode;
  if (typeof status !== 'number') return true;
  return status >= 500 || status === 408 || status === 429;
}

export function createActions(ctx: ActionsContext): ActionsResult {
  const dispatchedToolInvocations = new Set<string>();
  const { client, dispatch, getState, getConfig, getChatId, getClientToolHandlers, getStreamManager, setStreamManager, getStreamEnabled, getPollIntervalMs, callbacks } = ctx;

  /**
   * The interrupt a call awaiting approval waits on: approving or rejecting
   * the call resolves it, like every other pause. The chat's pending
   * interrupts carry it; when they have not caught up with the call yet, the
   * run's are read from the api.
   */
  const approvalInterruptId = async (toolInvocationId: string): Promise<string> => {
    const chat = getState().chat;
    let interrupt = approvalInterrupt(chat?.pending_interrupts, toolInvocationId);
    const runId = chat?.active_run?.id;
    if (!interrupt && runId) {
      interrupt = approvalInterrupt(await api.listRunInterrupts(client, runId), toolInvocationId);
    }
    if (!interrupt) throw new Error(`Tool call ${toolInvocationId} is not awaiting approval`);
    return interrupt.id;
  };

  let prevChatWasBusy = false;
  // Bumped by every streamChat() and stopStream(). A stream whose generation
  // is no longer current (stopped, reset, switched to another chat) leaves
  // state alone, including work it started before that.
  let streamGeneration = 0;

  // A client tool's result is the only way its turn continues: the server
  // waits on it. A result lost to a network drop left the turn stuck on
  // "running" for good, so it is sent again until it lands or is refused.
  const deliverToolResult = async (invocationId: string, result: string, attachments?: FileRef[]) => {
    for (let attempt = 1; ; attempt++) {
      try {
        if (attachments?.length) await api.submitToolResult(client, invocationId, result, attachments);
        else await api.submitToolResult(client, invocationId, result);
        return;
      } catch (err) {
        if (!isTransient(err) || attempt >= TOOL_RESULT_MAX_ATTEMPTS) {
          console.error(`[AgentSDK] Failed to submit tool result for ${invocationId}:`, err);
          return;
        }
        const step = Math.min(30_000, 1000 * 2 ** (attempt - 1));
        await new Promise((r) => setTimeout(r, step / 2 + Math.random() * (step / 2)));
      }
    }
  };

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

  const setChat = (result: FetchChatResult | null) => {
    const chat = result?.chat ?? null;
    dispatch({ type: 'SET_CHAT', payload: chat, messageCursor: result?.messageCursor, hasOlderMessages: result?.hasOlderMessages });
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
            deliverToolResult(invocation.id, JSON.stringify({
              status: 'not_available',
              message: `Client tool "${functionName}" is not available in this environment`,
            }));
            continue;
          }

          // Execute the handler (it captures any needed state via closure)
          // Use Promise.resolve to handle both sync and async handlers
          const args = invocation.function?.arguments || {};
          Promise.resolve(handler(args))
            .then((output: ClientToolResult) =>
              typeof output === 'string'
                ? deliverToolResult(invocation.id, output)
                : deliverToolResult(invocation.id, output.result, output.attachments),
            )
            .catch((error: unknown) => {
              console.error(`[AgentSDK] Client tool ${functionName} error:`, error);
              return deliverToolResult(invocation.id, JSON.stringify({
                error: String(error)
              }));
            });
        }
      }
    }
  };

  const streamChat = async (id: string) => {
    const generation = ++streamGeneration;
    const existingManager = getStreamManager();
    if (existingManager) {
      existingManager.stop();
    }

    setStreamManager(undefined);
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
    callbacks.onStatusChange?.('connecting');

    try {
      // Fetch initial chat (fetchChat loads messages separately since Chat.Get no longer preloads them)
      const fetchResult = await api.fetchChat(client, id);
      // Stopped or switched to another chat while fetching.
      if (generation !== streamGeneration) return;
      if (fetchResult) {
        setChat(fetchResult);
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

    // Token-by-token streaming state, one accumulator per message being
    // streamed. Deltas name their message (DeltaEvent.resource_id), so state
    // never leaks between messages the way a single shared accumulator allowed.
    const deltaAccums = new Map<string, DeltaAccumulator>();

    const isCurrent = () => generation === streamGeneration;
    let failed = false;

    // The API does not replay what the stream missed: the chat as fetched is
    // the source of truth. Messages are merged, so older pages stay loaded.
    const resync = async (): Promise<ChatDTO | null> => {
      const fetchResult = await api.fetchChat(client, id);
      if (!fetchResult || !isCurrent()) return null;
      const { chat } = fetchResult;
      for (const message of chat.chat_messages ?? []) {
        updateMessage(message);
      }
      dispatch({ type: 'UPDATE_CHAT', payload: chat });
      callbacks.onStatusChange?.(isChatBusy(chat) ? 'streaming' : 'idle');
      checkTurnEnd(chat);
      return chat;
    };

    // Single unified stream with TypedEvents (both Chat and ChatMessage events)
    const manager = new StreamableManager<unknown>({
      request: api.chatStreamRequest(client, id),
      reconnect: true,
      onRetry: (error, attempt, delayMs) => {
        console.warn(`[AgentSDK] Stream error, reconnecting in ${delayMs}ms (attempt ${attempt}):`, error);
        if (!isCurrent()) return;
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'connecting' });
        callbacks.onStatusChange?.('connecting');
      },
      onReconnect: async () => {
        // Partial text from before the drop is replaced by the fetched messages.
        deltaAccums.clear();
        if (!isCurrent()) return;
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'streaming' });
        await resync();
      },
      onError: (error) => {
        // The manager gave up: a refusal, or every retry failed.
        console.warn('[AgentSDK] Stream error:', error);
        if (!isCurrent()) return;
        failed = true;
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: error.message });
        callbacks.onError?.(error);
      },
      onStart: () => {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'streaming' });
        callbacks.onStatusChange?.('streaming');
      },
      onEnd: () => {
        // An intentional stop or a newer stream skips all of this.
        if (!isCurrent() || getStreamManager() !== manager) return;
        // The stream ended cleanly or gave up. Release the ref now, so a
        // sendMessage meanwhile opens a new stream (and makes this one stale).
        setStreamManager(undefined);
        // A turn still running would leave the UI busy with nothing to end
        // it: read the chat, and poll it until idle if it is still busy.
        resync()
          .catch(() => null)
          .then((chat) => {
            if (!isCurrent() || getStreamManager()) return;
            if (chat ? isChatBusy(chat) : isChatBusy(getState().chat)) {
              pollChat(id, { untilIdle: true });
              return;
            }
            if (failed) return; // keep the 'error' status
            dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'idle' });
            callbacks.onStatusChange?.('idle');
          });
      },
    });

    // Listen for Chat object updates (status changes only — don't replace messages)
    manager.addEventListener<ChatDTO>('chats', (chatData, fields) => {
      if (!chatData) return;
      dispatch({ type: 'UPDATE_CHAT', payload: chatData, fields });
      // A partial update (a plan step writing agent_data) says nothing about
      // the turn on its own: judge the chat it merges into.
      const chat = applyChatUpdate(getState().chat, chatData, fields);
      if (chat) {
        callbacks.onStatusChange?.(isChatBusy(chat) ? 'streaming' : 'idle');
        checkTurnEnd(chat);
      }
    });

    // Listen for ChatMessage updates
    manager.addEventListener<ChatMessageDTO>('chat_messages', (message, fields) => {
      // A message that has reached a terminal state will receive no further
      // deltas, so its accumulator is done. This bounds the map by the number
      // of messages streaming at once rather than by chat length.
      if (isMessageTerminal(message.status)) {
        deltaAccums.delete(message.id);
      }
      updateMessage(message, fields);
    });

    // Listen for AgentRun updates (state transitions, output)
    manager.addEventListener<AgentRunDTO>('agent_runs', (run, fields) => {
      dispatch({ type: 'UPDATE_ACTIVE_RUN', payload: run, fields });
      // A partial update (the run's output) carries no state.
      if (fields) return;
      callbacks.onStatusChange?.(isRunWorking(run.state) || isRunInterrupted(run.state) ? 'streaming' : 'idle');
      const currentChat = getState().chat;
      if (currentChat) checkTurnEnd({ ...currentChat, active_run: run });
    });

    manager.addEventListener<DeltaEvent>('delta', (evt) => {
      if (!evt || !evt.delta) return;

      // On a chat stream every task is created with an execution edge, so a
      // delta with no resource id means something is wrong upstream — a missing
      // or ambiguous edge, or a failed lookup. Guessing a target there would
      // reintroduce exactly the misattribution this field exists to end, so
      // drop it: the text still lands when the message itself arrives.
      const messageId = evt.resource_id;
      if (!messageId) return;

      let accum = deltaAccums.get(messageId);
      if (!accum) {
        accum = createLLMDeltaAccumulator();
        deltaAccums.set(messageId, accum);
      }
      accum.apply(evt.delta);
      dispatch({ type: 'DELTA_TOKEN', payload: { messageId, output: accum.toOutput() } });
    });

    setStreamManager(manager);
    manager.start();
  };

  /**
   * Poll-based alternative to streaming for restricted environments. With
   * `untilIdle` (the fallback when a stream gave up mid-turn) polling stops
   * once the chat is idle; the next sendMessage streams again.
   */
  const pollChat = (id: string, { untilIdle = false }: { untilIdle?: boolean } = {}) => {
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
          const fetchResult = await api.fetchChat(client, id);
          if (fetchResult) {
            setChat(fetchResult);
            const { chat } = fetchResult;
            if (chat.chat_messages) {
              for (const message of chat.chat_messages) {
                updateMessage(message);
              }
            }
            if (untilIdle && !isChatBusy(chat) && getStreamManager() === manager) {
              // Clear the ref first so onStop is a no-op.
              setStreamManager(undefined);
              manager.stop();
              dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'idle' });
              callbacks.onStatusChange?.('idle');
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
    streamGeneration++;
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

          // An open SSE stream owns the message: it may already have moved it
          // on (a message that ends a wait is taken up before this response
          // returns). Polling refetches only when the chat's status changes,
          // so it shows the response, as does a chat with no stream yet.
          const manager = getStreamManager();
          if (userMessage && !(manager instanceof StreamableManager)) dispatch({ type: 'UPDATE_MESSAGE', payload: userMessage });

          if (newChatId && !manager) {
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

    submitToolResult: async (toolInvocationId: string, result: string, attachments?: FileRef[]) => {
      try {
        await api.submitToolResult(client, toolInvocationId, result, attachments);
      } catch (error) {
        console.error('[AgentSDK] Failed to submit tool result:', error);
        const err = error instanceof Error ? error : new Error('Failed to submit tool result');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    submitMCPInput: async (toolInvocationId: string, responses: Record<string, ElicitResult>) => {
      try {
        await api.submitToolResult(client, toolInvocationId, buildMCPInputResult(responses));
      } catch (error) {
        // A 400 means the answers were rejected and the call is still waiting:
        // the caller shows it next to the form, the connection is fine.
        if (isInferenceError(error) && error.statusCode === 400) throw error;
        console.error('[AgentSDK] Failed to submit MCP input:', error);
        const err = error instanceof Error ? error : new Error('Failed to submit MCP input');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    approveTool: async (toolInvocationId: string) => {
      try {
        await api.resolveInterrupt(client, await approvalInterruptId(toolInvocationId), 'allow');
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
        await api.resolveInterrupt(client, await approvalInterruptId(toolInvocationId), 'deny', reason);
      } catch (error) {
        console.error('[AgentSDK] Failed to reject tool:', error);
        const err = error instanceof Error ? error : new Error('Failed to reject tool');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    getAlwaysAllowOptions: async (toolInvocationId: string) => {
      const chatId = getChatId();
      if (!chatId) return null;
      return api.getAlwaysAllowOptions(client, chatId, toolInvocationId);
    },

    explainTool: async (toolInvocationId: string) => {
      const chatId = getChatId();
      if (!chatId) throw new Error('Cannot explain a tool call without a chat');
      return api.explainTool(client, chatId, toolInvocationId);
    },

    alwaysAllowTool: async (toolInvocationId: string, choice?: AlwaysAllowChoice | string) => {
      const chatId = getChatId();

      if (!chatId) {
        console.error('[AgentSDK] Cannot always-allow tool without a chatId');
        return undefined;
      }

      // A string is the tool name older callers passed; the api reads the
      // tool from the call, so it only means "the default option".
      const option = typeof choice === 'string' ? undefined : choice?.option;
      try {
        return await api.alwaysAllowTool(client, chatId, toolInvocationId, option);
      } catch (error) {
        // 409: the option is stale (the rules changed since it was read);
        // 400: nothing can be always-allowed here. The call is still
        // waiting and the connection is fine: the caller reads the options
        // again or shows why.
        if (isInferenceError(error) && (error.statusCode === 409 || error.statusCode === 400)) throw error;
        console.error('[AgentSDK] Failed to always-allow tool:', error);
        const err = error instanceof Error ? error : new Error('Failed to always-allow tool');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    updateChatSettings: async (settings: ChatSettingsRequest) => {
      const chatId = getChatId();

      if (!chatId) {
        console.error('[AgentSDK] Cannot change chat settings without a chatId');
        return;
      }

      try {
        dispatch({ type: 'MERGE_CHAT_SETTINGS', payload: await api.updateChatSettings(client, chatId, settings) });
      } catch (error) {
        console.error('[AgentSDK] Failed to change chat settings:', error);
        const err = error instanceof Error ? error : new Error('Failed to change chat settings');
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    switchAgent: async (agentRef: string) => {
      const chatId = getChatId();

      if (!chatId) {
        console.error('[AgentSDK] Cannot switch the agent without a chatId');
        return;
      }

      try {
        dispatch({ type: 'MERGE_CHAT_AGENT', payload: await api.setAgent(client, chatId, agentRef) });
      } catch (error) {
        console.error('[AgentSDK] Failed to switch the agent:', error);
        const err = error instanceof Error ? error : new Error('Failed to switch the agent');
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

    resolveInterrupt: async (interruptId: string, decision: 'allow' | 'deny') => {
      try {
        await api.resolveInterrupt(client, interruptId, decision);
      } catch (error) {
        console.error('[AgentSDK] Failed to resolve interrupt:', error);
        const err = error instanceof Error ? error : new Error('Failed to resolve interrupt');
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'error' });
        dispatch({ type: 'SET_ERROR', payload: err.message });
        callbacks.onError?.(err);
        throw error;
      }
    },

    listRunInterrupts: (runId: string) => api.listRunInterrupts(client, runId),

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

export function getClientToolHandlers(config: import('./types.js').AgentOptions | null): Map<string, import('./types.js').ClientToolHandlerFn> {
  if (!config || !isAdHocConfig(config) || !config.tools) {
    return new Map();
  }
  return extractClientToolHandlers(config.tools);
}
