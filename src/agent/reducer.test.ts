import type { ChatDTO, ChatMessageDTO } from '../types';
import { ChatStatusBusy, ChatStatusIdle } from '../types';
import { chatReducer, initialState } from './reducer';

function makeMessage(id: string, order: number, chatId = 'chat-1'): ChatMessageDTO {
  return {
    id,
    short_id: id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: 'private',
    chat_id: chatId,
    order,
    status: 'completed',
    role: 'user',
    content: [{ type: 'text', text: `message ${id}` }],
  } as ChatMessageDTO;
}

function makeChat(overrides: Partial<ChatDTO> = {}): ChatDTO {
  return {
    id: 'chat-1',
    short_id: 'c1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: 'private',
    status: ChatStatusBusy,
    name: 'Test chat',
    description: '',
    children: [],
    chat_messages: [makeMessage('msg-1', 1), makeMessage('msg-2', 2)],
    agent_data: {} as ChatDTO['agent_data'],
    ...overrides,
  } as ChatDTO;
}

describe('chatReducer', () => {
  it('SET_CHAT should sort messages by order', () => {
    const chat = makeChat({
      chat_messages: [makeMessage('msg-2', 2), makeMessage('msg-1', 1)],
    });

    const next = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
    expect(next.chat?.status).toBe(ChatStatusBusy);
  });

  it('UPDATE_CHAT should update chat metadata without replacing messages', () => {
    const chat = makeChat();
    const withMessages = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    const idleChat = makeChat({ status: ChatStatusIdle, chat_messages: [] });
    const next = chatReducer(withMessages, { type: 'UPDATE_CHAT', payload: idleChat });

    expect(next.chat?.status).toBe(ChatStatusIdle);
    expect(next.messages).toHaveLength(2);
    expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });

  it('UPDATE_CHAT with null payload should leave state unchanged', () => {
    const chat = makeChat();
    const withChat = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    const next = chatReducer(withChat, { type: 'UPDATE_CHAT', payload: null });

    expect(next).toBe(withChat);
  });

  it('UPDATE_MESSAGE should replace an existing message by id', () => {
    const chat = makeChat();
    const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    const updated = makeMessage('msg-1', 1);
    updated.content = [{ type: 'text', text: 'edited' }];

    const next = chatReducer(state, { type: 'UPDATE_MESSAGE', payload: updated });

    expect(next.messages.find((m) => m.id === 'msg-1')?.content[0]?.text).toBe('edited');
    expect(next.messages).toHaveLength(2);
  });

  it('UPDATE_MESSAGE should append and sort new messages', () => {
    const chat = makeChat({ chat_messages: [makeMessage('msg-1', 1)] });
    const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    const next = chatReducer(state, { type: 'UPDATE_MESSAGE', payload: makeMessage('msg-2', 2) });

    expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });

  it('RESET should return initial state', () => {
    const chat = makeChat();
    const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    expect(chatReducer(state, { type: 'RESET' })).toEqual(initialState);
  });
});
