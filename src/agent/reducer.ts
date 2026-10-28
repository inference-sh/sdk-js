/**
 * Agent Chat Reducer
 *
 * Pure reducer for managing agent chat state.
 */

import type { AgentRunDTO, ChatDTO, ChatMessageContentType, ChatMessageDTO, ChatStatus } from '../types.js';
import {
  ChatMessageContentTypeReasoning,
  ChatMessageContentTypeText,
  ChatStatusBusy,
  ChatStatusAwaitingInput,
  ChatStatusIdle,
  ChatStatusWaiting,
} from '../types.js';
import { isMessageTerminal, isRunInterrupted, isRunWaiting, isRunWorking } from '../utils.js';
import type { AgentChatState, ChatAction } from './types.js';

function deriveChatStatus(run: AgentRunDTO | undefined | null): ChatStatus {
  if (!run) return ChatStatusIdle;
  if (isRunWorking(run.state)) return ChatStatusBusy;
  if (isRunWaiting(run)) return ChatStatusWaiting;
  if (isRunInterrupted(run.state)) return ChatStatusAwaitingInput;
  return ChatStatusIdle;
}

/**
 * A partial stream update (`fields` set) carries only the fields it names, so
 * it merges into the object it updates instead of replacing it: a chat update
 * naming only agent_data (a plan step) keeps the chat's status and active run.
 * A named field missing from the payload was cleared (omitempty).
 */
function mergeFields<T extends object>(existing: T, update: T, fields: string[]): T {
  const merged = { ...existing } as Record<string, unknown>;
  for (const field of fields) merged[field] = (update as Record<string, unknown>)[field];
  return merged as T;
}

/**
 * The chat after a chats event: replaced by a full one, merged with a partial
 * one. A partial update to another chat (or before any chat) is dropped.
 */
export function applyChatUpdate(existing: ChatDTO | null, update: ChatDTO, fields?: string[]): ChatDTO | null {
  if (!fields) return update;
  if (!existing || existing.id !== update.id) return existing;
  const merged = mergeFields(existing, update, fields);
  // The projector's update names active_run_id, which ChatDTO does not
  // declare. The run object belongs to that id: a new or cleared active run
  // drops it until the run's own event arrives.
  if (fields.includes('active_run_id')) {
    const runId = (update as { active_run_id?: string }).active_run_id;
    if (merged.active_run && merged.active_run.id !== runId) merged.active_run = undefined;
  }
  return merged;
}

/**
 * Every message enters state through here. The API serializes a message with
 * no content as `content: null` (a nil Go slice), and a partial stream update
 * carries the whole DTO with `content: null` when content is not among its
 * fields. State always holds an array, so ChatMessageDTO.content is what its
 * type says for every consumer; a partial update with null content keeps the
 * content the message already had.
 */
function normalizeMessage(message: ChatMessageDTO, existing?: ChatMessageDTO): ChatMessageDTO {
  if (message.content != null) return message;
  return { ...message, content: existing?.content ?? [] };
}

/**
 * The content blocks deltas stream, and the delta field each is built from.
 * An optional block gets no block until something streams into it.
 */
const streamedBlocks = [
  { type: ChatMessageContentTypeText, field: 'response', optional: false },
  { type: ChatMessageContentTypeReasoning, field: 'reasoning', optional: true },
] as const;

/** content with the block of type set to text, added in front when missing. */
function withBlockText(content: ChatMessageDTO['content'], type: ChatMessageContentType, text: string | undefined): ChatMessageDTO['content'] {
  return content.some((c) => c.type === type)
    ? content.map((c) => (c.type === type ? { ...c, text } : c))
    : [{ type, text } as ChatMessageDTO['content'][number], ...content];
}

const blockText = (message: ChatMessageDTO, type: ChatMessageContentType) => message.content.find((c) => c.type === type)?.text;

/** copy is an earlier version of shown: shown already has all of it and more. */
const isBehind = (copy: string | undefined, shown: string | undefined) => !!shown && shown.startsWith(copy ?? '');

/**
 * Streamed text and reasoning only grow until the message is done. Deltas
 * build them locally, while a message update carries the server's saved
 * copy, which can lag behind them (often still empty). While the message is
 * generating, a server copy behind what is shown keeps what is shown. Once
 * the message is terminal the server's copy is final and wins.
 */
function keepStreamedBlocks(updated: ChatMessageDTO, existing: ChatMessageDTO): ChatMessageDTO {
  if (isMessageTerminal(updated.status)) return updated;
  let content = updated.content;
  for (const { type } of streamedBlocks) {
    const shown = blockText(existing, type);
    if (isBehind(blockText(updated, type), shown)) content = withBlockText(content, type, shown);
  }
  return content === updated.content ? updated : { ...updated, content };
}

/**
 * The message with what the deltas have built so far. Deltas from a stream
 * joined mid-message start partway, behind what the message already shows,
 * so the message keeps its copy until they catch up.
 */
function applyStreamedOutput(message: ChatMessageDTO, output: Record<string, any>): ChatMessageDTO {
  let content = message.content;
  for (const { type, field, optional } of streamedBlocks) {
    const streamed: string | undefined = output[field];
    if (optional && !streamed) continue;
    if (!isBehind(streamed, blockText(message, type))) content = withBlockText(content, type, streamed);
  }
  return content === message.content ? message : { ...message, content };
}

const normalizeMessages = (messages: ChatMessageDTO[]) => messages.map((m) => normalizeMessage(m));

// =============================================================================
// Initial State
// =============================================================================

export const initialState: AgentChatState = {
  chatId: null,
  messages: [],
  connectionStatus: 'idle',
  error: undefined,
  chat: null,
  messageCursor: undefined,
  hasOlderMessages: undefined,
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
        return { ...state, chat: null, messages: [], connectionStatus: 'idle', messageCursor: undefined, hasOlderMessages: undefined };
      }
      const messages = normalizeMessages(chat.chat_messages || []).sort((a, b) => a.order - b.order);
      return { ...state, chat, messages, messageCursor: action.messageCursor, hasOlderMessages: action.hasOlderMessages };
    }

    case 'UPDATE_CHAT': {
      // Update chat metadata without replacing messages
      if (!action.payload) return state;
      const chat = applyChatUpdate(state.chat, action.payload, action.fields);
      return chat === state.chat ? state : { ...state, chat };
    }

    // The settings and set-agent endpoints answer with only what they wrote.
    // Merge it into the chat it belongs to; a chat switched away from in the
    // meantime is left alone.
    case 'MERGE_CHAT_SETTINGS': {
      const settings = action.payload;
      if (!state.chat || state.chat.id !== settings.chat_id) return state;
      return {
        ...state,
        chat: {
          ...state.chat,
          name: settings.name,
          visibility: settings.visibility,
          agent_data: {
            ...state.chat.agent_data,
            allow_all_tools: settings.allow_all_tools,
            disable_hooks: settings.disable_hooks,
            memory: settings.memory,
          },
        },
      };
    }

    case 'MERGE_CHAT_AGENT': {
      const agent = action.payload;
      if (!state.chat || state.chat.id !== agent.chat_id) return state;
      return {
        ...state,
        chat: {
          ...state.chat,
          agent_id: agent.agent_id,
          agent: agent.agent,
          agent_version_id: agent.agent_version_id,
          agent_version: agent.agent_version,
        },
      };
    }

    case 'UPDATE_ACTIVE_RUN': {
      if (!state.chat) return state;
      let run = action.payload;
      if (action.fields) {
        // A partial update (the run's output) needs the run it belongs to.
        const existing = state.chat.active_run;
        if (!existing || existing.id !== run.id) return state;
        run = mergeFields(existing, run, action.fields);
      }
      return { ...state, chat: { ...state.chat, active_run: run, status: deriveChatStatus(run) } };
    }

    case 'SET_MESSAGES':
      return { ...state, messages: normalizeMessages(action.payload) };

    case 'PREPEND_MESSAGES': {
      const { messages: older, cursor, hasMore } = action.payload;
      const existingIds = new Set(state.messages.map(m => m.id));
      const deduped = normalizeMessages(older.filter(m => !existingIds.has(m.id)));
      const merged = [...deduped, ...state.messages].sort((a, b) => a.order - b.order);
      return { ...state, messages: merged, messageCursor: cursor, hasOlderMessages: hasMore };
    }

    case 'UPDATE_MESSAGE': {
      const message = action.payload;
      const existingIndex = state.messages.findIndex((m) => m.id === message.id);
      if (existingIndex !== -1) {
        const existing = state.messages[existingIndex];
        const updated = keepStreamedBlocks(
          action.partial ? normalizeMessage({ ...existing, ...message }, existing) : normalizeMessage(message),
          existing,
        );
        if (existing === updated) return state;
        const newMessages = [...state.messages];
        newMessages[existingIndex] = updated;
        return { ...state, messages: newMessages };
      }
      if (action.partial) return state;
      return { ...state, messages: [...state.messages, normalizeMessage(message)].sort((a, b) => a.order - b.order) };
    }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, normalizeMessage(action.payload)].sort((a, b) => a.order - b.order),
      };

    case 'DELTA_TOKEN': {
      const { messageId, output } = action.payload;
      const msgs = state.messages;
      // Apply to the message the delta names — never to a guessed one. A
      // message we have not received yet (or an unnamed delta) is dropped
      // rather than misattributed; the text still arrives with the message.
      const target = msgs.find(m => m.id === messageId);
      if (!target) return state;
      const next = applyStreamedOutput(target, output);
      if (next === target) return state;
      return { ...state, messages: msgs.map(m => (m.id === target.id ? next : m)) };
    }

    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload };

    case 'SET_AGENT_INFO':
      return { ...state, agentInfo: action.payload };

    case 'RESET':
      return { ...initialState, agentInfo: state.agentInfo };

    default:
      return state;
  }
}
