import { chatReducer, initialState } from './reducer';
import { ChatStatusBusy, ChatStatusIdle } from '../types';
import type { ChatDTO, ChatMessageDTO } from '../types';

function makeMessage(id: string, order: number): ChatMessageDTO {
  return {
    id,
    short_id: id,
    user_id: 'user-1',
    chat_id: 'chat-1',
    order,
    status: 'completed',
    role: 'user',
    content: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    team_id: 'team-1',
    visibility: 'private',
  } as ChatMessageDTO;
}

function makeChat(status: string, messages: ChatMessageDTO[]): ChatDTO {
  return {
    id: 'chat-1',
    short_id: 'chat-1',
    user_id: 'user-1',
    status,
    chat_messages: messages,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    team_id: 'team-1',
    visibility: 'private',
    children: [],
    agent_data: { plan_steps: [], memory: {}, always_allowed_tools: [] },
    name: '',
    description: '',
  } as ChatDTO;
}

describe('chatReducer', () => {
  it('UPDATE_CHAT updates chat metadata without replacing messages', () => {
    const messages = [makeMessage('m1', 1), makeMessage('m2', 2)];
    const state = {
      ...initialState,
      chat: makeChat(ChatStatusBusy, messages),
      messages,
    };

    const next = chatReducer(state, {
      type: 'UPDATE_CHAT',
      payload: makeChat(ChatStatusIdle, messages),
    });

    expect(next.chat?.status).toBe(ChatStatusIdle);
    expect(next.messages).toBe(messages);
    expect(next.messages).toHaveLength(2);
  });

  it('UPDATE_CHAT is a no-op when payload is null', () => {
    const messages = [makeMessage('m1', 1)];
    const state = { ...initialState, messages };

    const next = chatReducer(state, { type: 'UPDATE_CHAT', payload: null });

    expect(next).toBe(state);
  });

  it('SET_CHAT sorts messages by order', () => {
    const messages = [makeMessage('m2', 2), makeMessage('m1', 1)];
    const chat = makeChat(ChatStatusIdle, messages);

    const next = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    expect(next.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
  });
});
