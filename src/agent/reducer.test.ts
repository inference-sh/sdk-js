import type { ChatDTO, ChatMessageDTO } from '../types';
import { ChatStatusBusy, ChatStatusIdle } from '../types';
import { chatReducer, initialState } from './reducer';

const baseTimestamps = {
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function makeMessage(overrides: Partial<ChatMessageDTO> & { id: string; order: number }): ChatMessageDTO {
  const { id, order, ...rest } = overrides;
  return {
    ...baseTimestamps,
    chat_id: 'chat-1',
    status: 'completed',
    role: 'assistant',
    content: [{ type: 'text', text: `message-${id}` }],
    ...rest,
    id,
    short_id: id,
    order,
  } as ChatMessageDTO;
}

function makeChat(overrides: Partial<ChatDTO> = {}): ChatDTO {
  return {
    id: 'chat-1',
    short_id: 'chat-1',
    status: ChatStatusBusy,
    name: 'Test chat',
    description: '',
    children: [],
    chat_messages: [],
    agent_data: {} as ChatDTO['agent_data'],
    ...baseTimestamps,
    ...overrides,
  } as ChatDTO;
}

describe('chatReducer', () => {
  it('UPDATE_CHAT should update chat metadata without replacing messages', () => {
    const messages = [makeMessage({ id: 'msg-1', order: 0 })];
    const state = {
      ...initialState,
      chatId: 'chat-1',
      messages,
      chat: makeChat({ status: ChatStatusBusy, chat_messages: messages }),
      connectionStatus: 'streaming' as const,
    };

    const updatedChat = makeChat({ status: ChatStatusIdle, chat_messages: [] });
    const next = chatReducer(state, { type: 'UPDATE_CHAT', payload: updatedChat });

    expect(next.chat?.status).toBe(ChatStatusIdle);
    expect(next.messages).toEqual(messages);
  });

  it('UPDATE_CHAT with null payload should leave state unchanged', () => {
    const state = {
      ...initialState,
      messages: [makeMessage({ id: 'msg-1', order: 0 })],
    };

    const next = chatReducer(state, { type: 'UPDATE_CHAT', payload: null });
    expect(next).toBe(state);
  });

  it('SET_CHAT should sort messages by order', () => {
    const chat = makeChat({
      chat_messages: [
        makeMessage({ id: 'msg-2', order: 2 }),
        makeMessage({ id: 'msg-1', order: 1 }),
      ],
    });

    const next = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });
    expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });

  it('SET_CHAT with null should reset to initial state fields', () => {
    const state = {
      ...initialState,
      chatId: 'chat-1',
      messages: [makeMessage({ id: 'msg-1', order: 0 })],
      connectionStatus: 'streaming' as const,
    };

    const next = chatReducer(state, { type: 'SET_CHAT', payload: null });
    expect(next.chat).toBeNull();
    expect(next.messages).toEqual([]);
    expect(next.connectionStatus).toBe('idle');
  });

  it('UPDATE_MESSAGE should replace an existing message by id', () => {
    const original = makeMessage({ id: 'msg-1', order: 0 });
    const state = { ...initialState, messages: [original] };
    const updated = makeMessage({
      id: 'msg-1',
      order: 0,
      content: [{ type: 'text', text: 'updated text' }],
    });

    const next = chatReducer(state, { type: 'UPDATE_MESSAGE', payload: updated });
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0].content[0].text).toBe('updated text');
  });

  it('UPDATE_MESSAGE should append and sort new messages', () => {
    const state = {
      ...initialState,
      messages: [makeMessage({ id: 'msg-2', order: 2 })],
    };
    const newMessage = makeMessage({ id: 'msg-1', order: 1 });

    const next = chatReducer(state, { type: 'UPDATE_MESSAGE', payload: newMessage });
    expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });
});
