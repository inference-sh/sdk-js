import type { ChatDTO, ChatMessageDTO } from '../types';
import {
  ChatMessageRoleAssistant,
  ChatMessageStatusReady,
  ChatStatusBusy,
  ChatStatusIdle,
} from '../types';
import { chatReducer, initialState } from './reducer';

const permissionFields = {
  user_id: 'user-1',
  team_id: 'team-1',
  visibility: 'private' as const,
};

function makeMessage(id: string, order: number): ChatMessageDTO {
  return {
    ...permissionFields,
    id,
    short_id: id,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    chat_id: 'chat-1',
    order,
    status: ChatMessageStatusReady,
    role: ChatMessageRoleAssistant,
    content: [],
  };
}

function makeChat(
  status: string,
  messages: ChatMessageDTO[] = []
): ChatDTO {
  return {
    ...permissionFields,
    id: 'chat-1',
    short_id: 'c1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    status,
    name: 'Test',
    description: '',
    children: [],
    chat_messages: messages,
    agent_data: { plan_steps: [], memory: {}, always_allowed_tools: [] },
  };
}

describe('chatReducer', () => {
  describe('UPDATE_CHAT', () => {
    it('should update chat metadata without replacing messages', () => {
      const messages = [makeMessage('msg-1', 1), makeMessage('msg-2', 2)];
      const state = {
        ...initialState,
        chatId: 'chat-1',
        messages,
        chat: makeChat(ChatStatusBusy, messages),
        connectionStatus: 'streaming' as const,
      };

      const idleChat = makeChat(ChatStatusIdle, messages);
      const next = chatReducer(state, { type: 'UPDATE_CHAT', payload: idleChat });

      expect(next.chat?.status).toBe(ChatStatusIdle);
      expect(next.messages).toBe(messages);
      expect(next.messages).toHaveLength(2);
    });

    it('should return state unchanged when payload is null', () => {
      const state = {
        ...initialState,
        chat: makeChat(ChatStatusBusy),
      };

      const next = chatReducer(state, { type: 'UPDATE_CHAT', payload: null });
      expect(next).toBe(state);
    });
  });

  describe('SET_CHAT', () => {
    it('should sort messages by order when setting chat', () => {
      const chat = makeChat(ChatStatusBusy, [
        makeMessage('msg-2', 2),
        makeMessage('msg-1', 1),
      ]);

      const next = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

      expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
    });

    it('should clear messages and set idle when chat is null', () => {
      const state = {
        ...initialState,
        messages: [makeMessage('msg-1', 1)],
        chat: makeChat(ChatStatusBusy),
        connectionStatus: 'streaming' as const,
      };

      const next = chatReducer(state, { type: 'SET_CHAT', payload: null });

      expect(next.chat).toBeNull();
      expect(next.messages).toEqual([]);
      expect(next.connectionStatus).toBe('idle');
    });
  });

  describe('UPDATE_MESSAGE', () => {
    it('should replace an existing message in place', () => {
      const original = makeMessage('msg-1', 1);
      const state = { ...initialState, messages: [original] };
      const updated = { ...original, content: [{ type: 'text', text: 'done' }] };

      const next = chatReducer(state, { type: 'UPDATE_MESSAGE', payload: updated });

      expect(next.messages).toHaveLength(1);
      expect(next.messages[0]).toBe(updated);
    });

    it('should append and sort new messages by order', () => {
      const state = { ...initialState, messages: [makeMessage('msg-1', 1)] };
      const newMessage = makeMessage('msg-2', 2);

      const next = chatReducer(state, { type: 'UPDATE_MESSAGE', payload: newMessage });

      expect(next.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2']);
    });
  });

  describe('RESET', () => {
    it('should return initial state', () => {
      const state = {
        ...initialState,
        chatId: 'chat-1',
        messages: [makeMessage('msg-1', 1)],
        connectionStatus: 'error' as const,
        error: 'failed',
      };

      expect(chatReducer(state, { type: 'RESET' })).toEqual(initialState);
    });
  });
});
