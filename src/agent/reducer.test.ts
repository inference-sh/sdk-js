import { chatReducer, initialState } from './reducer';
import type { ChatMessageDTO, ChatDTO } from '../types';
import {
  ChatMessageRoleUser,
  ChatMessageStatusReady,
  ChatStatusBusy,
} from '../types';

function message(overrides: Partial<ChatMessageDTO> & { id: string; order: number }): ChatMessageDTO {
  return {
    id: overrides.id,
    order: overrides.order,
    chat_id: overrides.chat_id ?? 'chat-1',
    status: overrides.status ?? ChatMessageStatusReady,
    role: overrides.role ?? ChatMessageRoleUser,
    content: overrides.content ?? [],
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
    short_id: overrides.short_id ?? 'm-short',
    user_id: overrides.user_id ?? 'user-1',
    team_id: overrides.team_id ?? 'team-1',
    visibility: overrides.visibility ?? 'private',
  };
}

function chat(overrides: Partial<ChatDTO> & { id: string }): ChatDTO {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Test',
    description: overrides.description ?? '',
    status: overrides.status ?? ChatStatusBusy,
    children: overrides.children ?? [],
    chat_messages: overrides.chat_messages ?? [],
    agent_data: overrides.agent_data ?? {
      plan_steps: [],
      memory: {},
      always_allowed_tools: [],
    },
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
    short_id: overrides.short_id ?? 'c-short',
    user_id: overrides.user_id ?? 'user-1',
    team_id: overrides.team_id ?? 'team-1',
    visibility: overrides.visibility ?? 'private',
  };
}

describe('chatReducer', () => {
  it('should return initial state on RESET', () => {
    const dirty = {
      ...initialState,
      chatId: 'chat-1',
      connectionStatus: 'streaming' as const,
    };
    expect(chatReducer(dirty, { type: 'RESET' })).toEqual(initialState);
  });

  it('SET_CHAT with null clears messages and sets idle', () => {
    const state = {
      ...initialState,
      chatId: 'chat-1',
      messages: [message({ id: 'm1', order: 0 })],
      connectionStatus: 'streaming' as const,
    };

    const next = chatReducer(state, { type: 'SET_CHAT', payload: null });
    expect(next.chat).toBeNull();
    expect(next.messages).toEqual([]);
    expect(next.connectionStatus).toBe('idle');
  });

  it('SET_CHAT sorts messages by order', () => {
    const payload = chat({
      id: 'chat-1',
      chat_messages: [
        message({ id: 'm2', order: 2 }),
        message({ id: 'm1', order: 1 }),
      ],
    });

    const next = chatReducer(initialState, { type: 'SET_CHAT', payload });
    expect(next.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('UPDATE_CHAT updates metadata without replacing messages', () => {
    const existing = message({ id: 'm1', order: 0 });
    const state = {
      ...initialState,
      chat: chat({ id: 'chat-1' }),
      messages: [existing],
    };

    const next = chatReducer(state, {
      type: 'UPDATE_CHAT',
      payload: chat({ id: 'chat-1', name: 'Renamed' }),
    });

    expect(next.chat?.name).toBe('Renamed');
    expect(next.messages).toEqual([existing]);
  });

  it('UPDATE_CHAT with null leaves state unchanged', () => {
    const state = {
      ...initialState,
      chat: chat({ id: 'chat-1' }),
      messages: [message({ id: 'm1', order: 0 })],
    };

    expect(chatReducer(state, { type: 'UPDATE_CHAT', payload: null })).toBe(state);
  });

  it('UPDATE_MESSAGE replaces an existing message by id', () => {
    const state = {
      ...initialState,
      messages: [message({ id: 'm1', order: 0, content: [] })],
    };
    const updated = message({ id: 'm1', order: 0, content: [{ type: 'text', text: 'hi' }] });

    const next = chatReducer(state, { type: 'UPDATE_MESSAGE', payload: updated });
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0].content).toEqual([{ type: 'text', text: 'hi' }]);
  });

  it('UPDATE_MESSAGE appends and sorts when message id is new', () => {
    const state = {
      ...initialState,
      messages: [message({ id: 'm1', order: 1 })],
    };

    const next = chatReducer(state, {
      type: 'UPDATE_MESSAGE',
      payload: message({ id: 'm2', order: 0 }),
    });

    expect(next.messages.map((m) => m.id)).toEqual(['m2', 'm1']);
  });

  it('ADD_MESSAGE appends and sorts by order', () => {
    const state = {
      ...initialState,
      messages: [message({ id: 'm2', order: 2 })],
    };

    const next = chatReducer(state, {
      type: 'ADD_MESSAGE',
      payload: message({ id: 'm1', order: 1 }),
    });

    expect(next.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });
});
