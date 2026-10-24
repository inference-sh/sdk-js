import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import { chatReducer, initialState } from '../agent/reducer.js';
import {
  ChatEventTypeHook,
  ChatEventTypeRunFailed,
  ChatMessageContentTypeEvent,
  ChatMessageRoleEvent,
  type ChatEventType,
  type ChatMessageDTO,
} from '../types.js';

/**
 * types regen 3476973: ChatEventTypeRunFailed for event-role messages when a run
 * ends in failure (error text lives on content.text, not hook).
 */
describe('ChatEventTypeRunFailed (3476973)', () => {
  it('exports ChatEventTypeRunFailed from types and the main barrel', () => {
    expect(ChatEventTypeRunFailed).toBe('run_failed');
    expect(main.ChatEventTypeRunFailed).toBe('run_failed');
    expect(main.ChatEventTypeHook).toBe('hook');
  });

  it('keeps run_failed distinct from hook on the ChatEventType union', () => {
    const kinds: ChatEventType[] = [ChatEventTypeHook, ChatEventTypeRunFailed];
    expect(kinds).toEqual(['hook', 'run_failed']);
    expect(ChatEventTypeRunFailed).not.toBe(ChatEventTypeHook);
  });

  it('types run-failed event messages with error text on content, not hook', () => {
    const runError = 'model provider returned 503';
    const eventMessage: Pick<ChatMessageDTO, 'role' | 'content'> = {
      role: ChatMessageRoleEvent,
      content: [
        {
          type: ChatMessageContentTypeEvent,
          text: runError,
          event: { type: ChatEventTypeRunFailed },
        },
      ],
    };
    expect(eventMessage.content[0]?.text).toBe(runError);
    expect(eventMessage.content[0]?.event?.type).toBe('run_failed');
    expect(eventMessage.content[0]?.event?.hook).toBeUndefined();
  });
});

describe('chat reducer run_failed event messages (3476973)', () => {
  it('SET_CHAT keeps display-only run_failed event-role messages', () => {
    const runError = 'tool execution timed out';
    const eventMessage = {
      id: 'msg-run-failed',
      short_id: 'msg-run-failed',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      chat_id: 'chat-1',
      order: 2,
      role: ChatMessageRoleEvent,
      content: [
        {
          type: ChatMessageContentTypeEvent,
          text: runError,
          event: { type: ChatEventTypeRunFailed },
        },
      ],
    } as ChatMessageDTO;

    const chat = {
      id: 'chat-1',
      status: 'idle',
      chat_messages: [eventMessage],
    };

    const next = chatReducer(initialState, { type: 'SET_CHAT', payload: chat as never });

    expect(next.messages).toHaveLength(1);
    expect(next.messages[0]?.role).toBe('event');
    expect(next.messages[0]?.content[0]?.text).toBe(runError);
    expect(next.messages[0]?.content[0]?.event).toEqual({ type: ChatEventTypeRunFailed });
  });
});

describe('types.ts regen guards (3476973)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('adds run_failed to ChatEventType and exports ChatEventTypeRunFailed', () => {
    expect(typesSource).toMatch(/export type ChatEventType = "hook" \| "run_failed";/);
    expect(typesSource).toMatch(
      /export const ChatEventTypeRunFailed: ChatEventType = "run_failed";/,
    );
    expect(typesSource).toMatch(
      /ChatEventTypeRunFailed marks the point a run ended in failure[\s\S]*content's text is the run's error/,
    );
  });
});

describe('stream dispatch does not gate event messages on hook only (3476973)', () => {
  const actionsSource = readFileSync(join(__dirname, '../agent/actions.ts'), 'utf8');

  it('forwards every chat_messages payload via UPDATE_MESSAGE without ChatEventTypeHook filter', () => {
    expect(actionsSource).toMatch(/type: 'UPDATE_MESSAGE', payload: message/);
    expect(actionsSource).not.toMatch(/ChatEventTypeHook/);
  });
});
