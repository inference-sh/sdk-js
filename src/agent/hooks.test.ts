import { useContext } from 'react';
import { AgentChatContext } from './context';
import {
  useAgentActions,
  useAgentChat,
  useAgentChatContext,
  useAgentClient,
  useMessage,
} from './hooks';
import type { AgentChatActions, AgentChatState, AgentClient } from './types';
import type { ChatMessageDTO } from '../types';

jest.mock('react', () => {
  const actual = jest.requireActual<typeof import('react')>('react');
  return {
    ...actual,
    useContext: jest.fn(),
  };
});

const mockUseContext = useContext as jest.Mock;

function makeMessage(id: string, content: string): ChatMessageDTO {
  return { id, content } as unknown as ChatMessageDTO;
}

const baseState: AgentChatState = {
  chatId: 'chat-1',
  chat: null,
  messages: [makeMessage('msg-1', 'hello'), makeMessage('msg-2', 'world')],
  connectionStatus: 'idle',
};

const baseActions = {
  sendMessage: jest.fn(),
  uploadFile: jest.fn(),
  stopGeneration: jest.fn(),
  reset: jest.fn(),
  clearError: jest.fn(),
  submitToolResult: jest.fn(),
  approveTool: jest.fn(),
  rejectTool: jest.fn(),
  alwaysAllowTool: jest.fn(),
} as unknown as AgentChatActions;

const baseClient = { run: jest.fn() } as unknown as AgentClient;

function mockProviderContext(
  value: {
    state?: AgentChatState;
    actions?: AgentChatActions;
    client?: AgentClient;
  } | null
) {
  if (value === null) {
    mockUseContext.mockReturnValue(null);
    return;
  }
  mockUseContext.mockReturnValue({
    state: value.state ?? baseState,
    actions: value.actions ?? baseActions,
    client: value.client ?? baseClient,
  });
}

describe('agent hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('useAgentChat should return state from context', () => {
    mockProviderContext({});
    expect(useAgentChat()).toBe(baseState);
    expect(mockUseContext).toHaveBeenCalledWith(AgentChatContext);
  });

  it('useAgentChat should throw outside provider', () => {
    mockProviderContext(null);
    expect(() => useAgentChat()).toThrow(/AgentChatProvider/);
  });

  it('useAgentActions should return actions from context', () => {
    mockProviderContext({});
    expect(useAgentActions()).toBe(baseActions);
  });

  it('useAgentActions should throw outside provider', () => {
    mockProviderContext(null);
    expect(() => useAgentActions()).toThrow(/AgentChatProvider/);
  });

  it('useMessage should find message by id', () => {
    mockProviderContext({});
    expect(useMessage('msg-2')).toEqual(baseState.messages[1]);
    expect(useMessage('missing')).toBeUndefined();
  });

  it('useAgentChatContext should return provider context value', () => {
    mockProviderContext({});
    expect(useAgentChatContext()).toEqual({
      state: baseState,
      actions: baseActions,
      client: baseClient,
    });
  });

  it('useAgentClient should return client from context', () => {
    mockProviderContext({});
    expect(useAgentClient()).toBe(baseClient);
  });

  it('useAgentClient should throw outside provider', () => {
    mockProviderContext(null);
    expect(() => useAgentClient()).toThrow(/AgentChatProvider/);
  });
});
