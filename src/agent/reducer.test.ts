import type { AgentRunDTO, ChatDTO, ChatMessageDTO } from '../types';
import { AgentRunStateCompleted, ChatStatusBusy, ChatStatusIdle } from '../types';
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

  it('UPDATE_ACTIVE_RUN should update active_run output without replacing messages', () => {
    const chat = makeChat();
    const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });
    const completedRun = {
      state: AgentRunStateCompleted,
      output: { answer: 42 },
    } as AgentRunDTO;

    const next = chatReducer(state, {
      type: 'UPDATE_ACTIVE_RUN',
      payload: completedRun,
    });

    expect(next.chat?.active_run).toBe(completedRun);
    expect(next.chat?.active_run?.output).toEqual({ answer: 42 });
    expect(next.messages).toHaveLength(2);
    expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });

  it('UPDATE_ACTIVE_RUN should leave state unchanged when chat is null', () => {
    const completedRun = { state: AgentRunStateCompleted } as AgentRunDTO;

    const next = chatReducer(initialState, {
      type: 'UPDATE_ACTIVE_RUN',
      payload: completedRun,
    });

    expect(next).toBe(initialState);
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

  it('SET_CHAT with null should clear chat, messages, and pagination metadata', () => {
    const chat = makeChat();
    (chat as unknown as Record<string, unknown>)._messageCursor = 'cursor-1';
    (chat as unknown as Record<string, unknown>)._hasOlderMessages = true;
    const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    const next = chatReducer(state, { type: 'SET_CHAT', payload: null });

    expect(next.chat).toBeNull();
    expect(next.messages).toEqual([]);
    expect(next.connectionStatus).toBe('idle');
    expect(next.messageCursor).toBeUndefined();
    expect(next.hasOlderMessages).toBeUndefined();
  });

  it('SET_CHAT should extract pagination metadata from the chat object', () => {
    const chat = makeChat();
    (chat as unknown as Record<string, unknown>)._messageCursor = 'cursor-xyz';
    (chat as unknown as Record<string, unknown>)._hasOlderMessages = true;

    const next = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    expect(next.messageCursor).toBe('cursor-xyz');
    expect(next.hasOlderMessages).toBe(true);
  });

  it('ADD_MESSAGE should append and sort by order', () => {
    const chat = makeChat({ chat_messages: [makeMessage('msg-1', 1)] });
    const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    const next = chatReducer(state, {
      type: 'ADD_MESSAGE',
      payload: makeMessage('msg-0', 0),
    });

    expect(next.messages.map((m) => m.id)).toEqual(['msg-0', 'msg-1']);
  });

  describe('PREPEND_MESSAGES', () => {
    it('should prepend older messages, dedupe by id, and update pagination metadata', () => {
      const chat = makeChat({ chat_messages: [makeMessage('msg-2', 2), makeMessage('msg-3', 3)] });
      const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

      const older = [makeMessage('msg-1', 1), makeMessage('msg-2', 2)];
      const next = chatReducer(state, {
        type: 'PREPEND_MESSAGES',
        payload: { messages: older, cursor: 'cursor-abc', hasMore: true },
      });

      expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2', 'msg-3']);
      expect(next.messageCursor).toBe('cursor-abc');
      expect(next.hasOlderMessages).toBe(true);
    });

    it('should update pagination metadata when no new messages are prepended', () => {
      const chat = makeChat({ chat_messages: [makeMessage('msg-1', 1)] });
      const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

      const next = chatReducer(state, {
        type: 'PREPEND_MESSAGES',
        payload: { messages: [makeMessage('msg-1', 1)], cursor: 'cursor-end', hasMore: false },
      });

      expect(next.messages.map((m) => m.id)).toEqual(['msg-1']);
      expect(next.messageCursor).toBe('cursor-end');
      expect(next.hasOlderMessages).toBe(false);
    });
  });

  it('SET_AGENT_INFO should store agent-level metadata', () => {
    const agentInfo = {
      description: 'Pricing assistant',
      example_prompts: ['Show me plans', 'Compare tiers'],
    };

    const next = chatReducer(initialState, { type: 'SET_AGENT_INFO', payload: agentInfo });

    expect(next.agentInfo).toEqual(agentInfo);
  });

  it('RESET should clear chat state but preserve agentInfo', () => {
    const chat = makeChat();
    const agentInfo = {
      description: 'Template agent',
      example_prompts: ['Hello'],
    };
    let state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });
    state = chatReducer(state, { type: 'SET_AGENT_INFO', payload: agentInfo });
    state = chatReducer(state, {
      type: 'SET_CONNECTION_STATUS',
      payload: 'streaming',
    });
    state = chatReducer(state, { type: 'SET_ERROR', payload: 'stream failed' });

    const next = chatReducer(state, { type: 'RESET' });

    expect(next).toEqual({ ...initialState, agentInfo });
    expect(next.chat).toBeNull();
    expect(next.messages).toEqual([]);
    expect(next.connectionStatus).toBe('idle');
    expect(next.error).toBeUndefined();
  });

  it('SET_CHAT_ID should update chatId', () => {
    const next = chatReducer(initialState, { type: 'SET_CHAT_ID', payload: 'chat-99' });
    expect(next.chatId).toBe('chat-99');
  });

  it('SET_MESSAGES should replace the message list', () => {
    const messages = [makeMessage('msg-a', 1)];
    const next = chatReducer(initialState, { type: 'SET_MESSAGES', payload: messages });
    expect(next.messages).toEqual(messages);
  });

  it('ADD_MESSAGE after SET_MESSAGES should append and sort by order', () => {
    const state = chatReducer(initialState, {
      type: 'SET_MESSAGES',
      payload: [makeMessage('msg-2', 2)],
    });

    const next = chatReducer(state, { type: 'ADD_MESSAGE', payload: makeMessage('msg-1', 1) });

    expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
  });

  it('SET_CONNECTION_STATUS and SET_ERROR should update connection fields', () => {
    const streaming = chatReducer(initialState, {
      type: 'SET_CONNECTION_STATUS',
      payload: 'streaming',
    });
    expect(streaming.connectionStatus).toBe('streaming');

    const errored = chatReducer(streaming, {
      type: 'SET_ERROR',
      payload: 'stream failed',
    });
    expect(errored.error).toBe('stream failed');
  });

  it('should return the same state for unknown action types', () => {
    const state = chatReducer(initialState, { type: 'UNKNOWN' } as never);
    expect(state).toBe(initialState);
  });
});
