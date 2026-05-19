import {
  ChatStatusBusy,
  ToolInvocationStatusAwaitingInput,
  ToolTypeClient,
} from '../types';
import type { ActionsContext, AgentOptions, UpdateManager } from './types';
import type { ChatDTO, ChatMessageDTO } from '../types';
import { createActions } from './actions';
import * as agentApi from './api';
import { PollManager } from '../http/poll';
import { StreamableManager } from '../http/streamable';

jest.mock('./api');
jest.mock('../http/streamable');
jest.mock('../http/poll');

const mockAgentApi = agentApi as jest.Mocked<typeof agentApi>;

function makeMessage(overrides: Record<string, unknown> = {}): ChatMessageDTO {
  return {
    id: 'msg-1',
    chat_id: 'chat-full-id-123',
    role: 'assistant',
    content: 'hello',
    ...overrides,
  } as unknown as ChatMessageDTO;
}

function createTestContext(overrides: Partial<ActionsContext> = {}): {
  ctx: ActionsContext;
  dispatch: jest.Mock;
  setStreamManager: jest.Mock;
} {
  const dispatch = jest.fn();
  let streamManager: UpdateManager | undefined;
  const getStreamManager = (): UpdateManager | undefined => streamManager;
  const setStreamManager = jest.fn((manager: UpdateManager | undefined) => {
    streamManager = manager;
  });

  const adHocConfig: AgentOptions = {
    core_app: { ref: 'openrouter/claude@abc' },
    system_prompt: 'test',
  };

  const ctx: ActionsContext = {
    client: {
      http: {
        request: jest.fn(),
        getStreamableConfig: jest.fn(() => ({ url: 'https://stream.test', headers: {} })),
        getStreamDefault: jest.fn(() => true),
        getPollIntervalMs: jest.fn(() => 50),
      },
      files: { upload: jest.fn() },
    },
    dispatch,
    getConfig: () => adHocConfig,
    getChatId: () => 'chat-short',
    getClientToolHandlers: () => new Map(),
    getStreamManager,
    setStreamManager,
    getStreamEnabled: () => true,
    getPollIntervalMs: () => 50,
    callbacks: {},
    ...overrides,
  };

  return { ctx, dispatch, setStreamManager };
}

describe('createActions', () => {
  let pollInstances: Array<{
    options: ConstructorParameters<typeof PollManager>[0];
    start: jest.Mock;
    stop: jest.Mock;
  }>;
  let streamInstances: Array<{
    options: ConstructorParameters<typeof StreamableManager>[0];
    addEventListener: jest.Mock;
    start: jest.Mock;
    stop: jest.Mock;
  }>;

  beforeEach(() => {
    jest.clearAllMocks();
    pollInstances = [];
    streamInstances = [];

    (PollManager as jest.Mock).mockImplementation((options) => {
      const instance = {
        options,
        start: jest.fn(),
        stop: jest.fn(),
      };
      pollInstances.push(instance);
      return instance;
    });

    (StreamableManager as jest.Mock).mockImplementation((options) => {
      const instance = {
        options,
        addEventListener: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
      };
      streamInstances.push(instance);
      return instance;
    });

    mockAgentApi.fetchChat.mockResolvedValue({
      id: 'chat-full-id-123',
      status: ChatStatusBusy,
      chat_messages: [],
    } as unknown as ChatDTO);
    mockAgentApi.getChatStreamConfig.mockReturnValue({
      url: 'https://api.test/chats/chat-full-id-123/stream',
      headers: {},
    });
    mockAgentApi.sendMessage.mockResolvedValue({
      chatId: 'chat-full-id-123',
      userMessage: makeMessage({ id: 'u1', role: 'user' }),
      assistantMessage: makeMessage(),
    });
    mockAgentApi.submitToolResult.mockResolvedValue(undefined);
  });

  describe('updateMessage (via stream listeners)', () => {
    it('should ignore messages for a different chat when IDs do not prefix-match', async () => {
      const { ctx, dispatch } = createTestContext({ getChatId: () => 'other-chat' });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onMessage = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      onMessage(makeMessage({ chat_id: 'unrelated-chat-id' }));
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'UPDATE_MESSAGE' })
      );
    });

    it('should accept messages when chat_id is a prefix extension of the short chatId', async () => {
      const { ctx, dispatch } = createTestContext({ getChatId: () => 'chat-short' });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-short');
      await Promise.resolve();

      const onMessage = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      onMessage(makeMessage({ chat_id: 'chat-short-full-suffix' }));
      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_MESSAGE',
        payload: expect.objectContaining({ chat_id: 'chat-short-full-suffix' }),
      });
    });

    it('should submit not_available when a client tool has no handler', async () => {
      const { ctx } = createTestContext({
        getClientToolHandlers: () =>
          new Map([['other_tool', jest.fn().mockResolvedValue('ok')]]),
      });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onMessage = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      onMessage(
        makeMessage({
          chat_id: 'chat-short',
          tool_invocations: [
            {
              id: 'tool-missing-handler',
              type: ToolTypeClient,
              status: ToolInvocationStatusAwaitingInput,
              function: { name: 'missing_tool', arguments: {} },
            },
          ],
        })
      );

      await Promise.resolve();

      expect(mockAgentApi.submitToolResult).toHaveBeenCalledWith(
        ctx.client,
        'tool-missing-handler',
        expect.stringContaining('not_available')
      );
    });
  });

  describe('streamChat', () => {
    it('should use PollManager when streaming is disabled', async () => {
      const { ctx } = createTestContext({
        getStreamEnabled: () => false,
      });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      expect(PollManager).toHaveBeenCalled();
      expect(StreamableManager).not.toHaveBeenCalled();
      expect(pollInstances[0].options.pollFunction).toBeDefined();
      expect(pollInstances[0].start).toHaveBeenCalled();
    });
  });

  describe('stopStream', () => {
    it('should clear the manager ref before stop so onEnd does not double-dispatch idle', async () => {
      const { ctx, dispatch, setStreamManager } = createTestContext();
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const manager = streamInstances[0];
      internalActions.stopStream();

      expect(setStreamManager).toHaveBeenCalledWith(undefined);
      expect(manager.stop).toHaveBeenCalled();

      manager.options.onEnd?.();
      const idleDispatches = dispatch.mock.calls.filter(
        ([action]) =>
          action.type === 'SET_CONNECTION_STATUS' && action.payload === 'idle'
      );
      // Only the explicit stopStream dispatch, not a second from onEnd
      expect(idleDispatches).toHaveLength(1);
    });
  });

  describe('pollChat', () => {
    it('should surface fetch errors via onError when status changes', async () => {
      const onError = jest.fn();
      const { ctx } = createTestContext({
        getStreamEnabled: () => false,
        callbacks: { onError },
      });
      const { internalActions } = createActions(ctx);

      mockAgentApi.fetchChat
        .mockResolvedValueOnce({
          id: 'chat-full-id-123',
          status: ChatStatusBusy,
          chat_messages: [],
        } as unknown as import('../types').ChatDTO)
        .mockRejectedValueOnce(new Error('chat fetch failed'));
      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const pollOnData = pollInstances[0].options.onData;
      await pollOnData?.({ status: ChatStatusBusy } as never);

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'chat fetch failed' }));
    });
  });

  describe('publicActions.stopGeneration', () => {
    it('should call stopChat when a chatId exists', () => {
      const { ctx } = createTestContext({ getChatId: () => 'chat-short' });
      const { publicActions } = createActions(ctx);

      publicActions.stopGeneration();

      expect(mockAgentApi.stopChat).toHaveBeenCalledWith(ctx.client, 'chat-short');
    });

    it('should no-op when there is no chatId', () => {
      const { ctx } = createTestContext({ getChatId: () => null });
      const { publicActions } = createActions(ctx);

      publicActions.stopGeneration();

      expect(mockAgentApi.stopChat).not.toHaveBeenCalled();
    });
  });

  describe('publicActions.submitToolResult', () => {
    it('should dispatch error state and rethrow when submit fails', async () => {
      const onError = jest.fn();
      mockAgentApi.submitToolResult.mockRejectedValueOnce(new Error('submit failed'));
      const { ctx, dispatch } = createTestContext({ callbacks: { onError } });
      const { publicActions } = createActions(ctx);

      await expect(publicActions.submitToolResult('inv-1', 'result')).rejects.toThrow(
        'submit failed'
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'error',
      });
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('internalActions.setChatId', () => {
    it('should reset and stop stream when chatId is cleared', async () => {
      const { ctx, dispatch } = createTestContext();
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();
      internalActions.setChatId(null);

      expect(streamInstances[0].stop).toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith({ type: 'RESET' });
    });
  });

  describe('publicActions.sendMessage', () => {
    it('should call onChatCreated and start streaming for a new chat', async () => {
      const onChatCreated = jest.fn();
      const { ctx } = createTestContext({
        getChatId: () => null,
        callbacks: { onChatCreated },
      });
      const { publicActions } = createActions(ctx);

      await publicActions.sendMessage('hello');

      expect(onChatCreated).toHaveBeenCalledWith('chat-full-id-123');
      expect(StreamableManager).toHaveBeenCalled();
    });

    it('should reset connection status when the API returns no result', async () => {
      mockAgentApi.sendMessage.mockResolvedValueOnce(null);
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({
        callbacks: { onStatusChange },
      });
      const { publicActions } = createActions(ctx);

      await publicActions.sendMessage('hello');

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'idle',
      });
      expect(onStatusChange).toHaveBeenCalledWith('idle');
    });
  });
});
