import {
  ChatStatusBusy,
  ChatStatusCompleted,
  ChatStatusIdle,
  AgentRunStateWorking,
  AgentRunStateCompleted,
  AgentRunStateInputRequired,
  ToolInvocationStatusAwaitingInput,
  ToolInvocationStatusInProgress,
  ToolTypeClient,
} from '../types';
import type { ActionsContext, AgentOptions, UpdateManager } from './types';
import type { ChatDTO, ChatMessageDTO, AgentRunDTO } from '../types';

const workingRun = { state: AgentRunStateWorking } as AgentRunDTO;
const completedRun = { state: AgentRunStateCompleted } as AgentRunDTO;
const inputRequiredRun = { state: AgentRunStateInputRequired } as AgentRunDTO;
import { createActions, getClientToolHandlers } from './actions';
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
        getStreamableConfig: jest.fn(() => ({ url: 'https://stream.test', headers: {}, credentials: 'include' as RequestCredentials })),
        getStreamDefault: jest.fn(() => true),
        getPollIntervalMs: jest.fn(() => 50),
      },
      files: { upload: jest.fn() },
    },
    dispatch,
    getState: () => ({ chatId: 'chat-short', messages: [], connectionStatus: 'idle' as const, chat: null }),
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
      active_run: workingRun,
      chat_messages: [],
    } as unknown as ChatDTO);
    mockAgentApi.fetchMessages.mockResolvedValue([]);
    mockAgentApi.fetchMessagesPage.mockResolvedValue({ items: [], next_cursor: '', has_next: false });
    mockAgentApi.getChatStreamConfig.mockReturnValue({
      url: 'https://api.test/chats/chat-full-id-123/stream',
      headers: {},
      credentials: 'include' as RequestCredentials,
    });
    mockAgentApi.sendMessage.mockResolvedValue({
      chatId: 'chat-full-id-123',
      userMessage: makeMessage({ id: 'u1', role: 'user' }),
    });
    mockAgentApi.submitToolResult.mockResolvedValue(undefined);
    mockAgentApi.resolveInterrupt.mockResolvedValue({
      id: 'int-1',
      status: 'resolved',
      resolution: 'allow',
      resource_type: 'tool_invocation',
    } as never);
    mockAgentApi.approveTool.mockResolvedValue(undefined);
    mockAgentApi.rejectTool.mockResolvedValue(undefined);
    mockAgentApi.alwaysAllowTool.mockResolvedValue(undefined);
    mockAgentApi.cancelMessage.mockResolvedValue(undefined);
    mockAgentApi.uploadFile.mockResolvedValue({
      id: 'file-1',
      uri: 'inf://files/uploaded',
      filename: 'notes.txt',
      content_type: 'text/plain',
    });
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

    it('should accept partial SSE updates that omit chat_id', async () => {
      const { ctx, dispatch } = createTestContext({ getChatId: () => 'chat-short' });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-short');
      await Promise.resolve();

      const onMessage = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      const partialUpdate = makeMessage({ chat_id: undefined, content: 'streaming chunk' });
      onMessage(partialUpdate);

      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_MESSAGE',
        payload: expect.objectContaining({ content: 'streaming chunk' }),
      });
    });

    it('should run the handler and submit its result when a client tool is available', async () => {
      const handler = jest.fn().mockResolvedValue('tool ok');
      const { ctx } = createTestContext({
        getClientToolHandlers: () => new Map([['my_tool', handler]]),
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
              id: 'tool-inv-ok',
              type: ToolTypeClient,
              status: ToolInvocationStatusAwaitingInput,
              function: { name: 'my_tool', arguments: { x: 1 } },
            },
          ],
        })
      );

      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith({ x: 1 });
      expect(mockAgentApi.submitToolResult).toHaveBeenCalledWith(
        ctx.client,
        'tool-inv-ok',
        'tool ok'
      );
    });

    it('should dispatch client tool handlers when status is in_progress', async () => {
      const handler = jest.fn().mockResolvedValue('in progress ok');
      const { ctx } = createTestContext({
        getClientToolHandlers: () => new Map([['my_tool', handler]]),
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
              id: 'tool-inv-progress',
              type: ToolTypeClient,
              status: ToolInvocationStatusInProgress,
              function: { name: 'my_tool', arguments: { y: 2 } },
            },
          ],
        })
      );

      await Promise.resolve();

      expect(handler).toHaveBeenCalledWith({ y: 2 });
      expect(mockAgentApi.submitToolResult).toHaveBeenCalledWith(
        ctx.client,
        'tool-inv-progress',
        'in progress ok'
      );
    });

    it('should submit a JSON error when a client tool handler throws', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('handler boom'));
      const { ctx } = createTestContext({
        getClientToolHandlers: () => new Map([['my_tool', handler]]),
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
              id: 'tool-inv-err',
              type: ToolTypeClient,
              status: ToolInvocationStatusAwaitingInput,
              function: { name: 'my_tool', arguments: {} },
            },
          ],
        })
      );

      await new Promise((resolve) => setImmediate(resolve));

      expect(mockAgentApi.submitToolResult).toHaveBeenCalledWith(
        ctx.client,
        'tool-inv-err',
        expect.stringContaining('handler boom')
      );
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

    it('should stop an existing stream manager before starting a new connection', async () => {
      const { ctx, dispatch } = createTestContext();
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const firstManager = streamInstances[0];
      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      expect(firstManager.stop).toHaveBeenCalled();
      expect(streamInstances).toHaveLength(2);
      expect(streamInstances[1].start).toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'connecting',
      });
    });

    it('should dispatch streaming status when the stream manager starts', async () => {
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onStatusChange } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      streamInstances[0].options.onStart?.();

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'streaming',
      });
      expect(onStatusChange).toHaveBeenCalledWith('streaming');
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

    it('should reset to idle when the stream ends unexpectedly with manager still set', async () => {
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onStatusChange } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      streamInstances[0].options.onEnd?.();

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'idle',
      });
      expect(onStatusChange).toHaveBeenCalledWith('idle');
    });

    it('should clear the manager ref before poll stop so onStop does not double-dispatch idle', async () => {
      const onStatusChange = jest.fn();
      const { ctx, dispatch, setStreamManager } = createTestContext({
        getStreamEnabled: () => false,
        callbacks: { onStatusChange },
      });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const manager = pollInstances[0];
      internalActions.stopStream();

      expect(setStreamManager).toHaveBeenCalledWith(undefined);
      expect(manager.stop).toHaveBeenCalled();

      manager.options.onStop?.();
      const idleDispatches = dispatch.mock.calls.filter(
        ([action]) =>
          action.type === 'SET_CONNECTION_STATUS' && action.payload === 'idle'
      );
      expect(idleDispatches).toHaveLength(1);
      expect(onStatusChange).toHaveBeenCalledWith('idle');
    });

    it('should reset to idle when poll transport stops unexpectedly with manager still set', async () => {
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({
        getStreamEnabled: () => false,
        callbacks: { onStatusChange },
      });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      pollInstances[0].options.onStop?.();

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'idle',
      });
      expect(onStatusChange).toHaveBeenCalledWith('idle');
    });
  });

  describe('stream and poll error callbacks', () => {
    it('should forward stream errors to onError callback', async () => {
      const onError = jest.fn();
      const { ctx } = createTestContext({ callbacks: { onError } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const streamError = new Error('stream connection lost');
      streamInstances[0].options.onError?.(streamError);

      expect(onError).toHaveBeenCalledWith(streamError);
    });

    it('should forward poll manager errors to onError callback', async () => {
      const onError = jest.fn();
      const { ctx } = createTestContext({
        getStreamEnabled: () => false,
        callbacks: { onError },
      });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const pollError = new Error('poll transport failed');
      pollInstances[0].options.onError?.(pollError);

      expect(onError).toHaveBeenCalledWith(pollError);
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
      expect(StreamableManager).toHaveBeenCalledWith(
        expect.objectContaining({ credentials: 'include' })
      );
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

    it('should dispatch error state when sendMessage throws', async () => {
      mockAgentApi.sendMessage.mockRejectedValueOnce(new Error('send failed'));
      const onError = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onError } });
      const { publicActions } = createActions(ctx);

      await publicActions.sendMessage('hello');

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'error',
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: 'send failed',
      });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'send failed' }));
    });

    it('should ignore whitespace-only messages', async () => {
      const { ctx } = createTestContext();
      const { publicActions } = createActions(ctx);

      await publicActions.sendMessage('   ');

      expect(mockAgentApi.sendMessage).not.toHaveBeenCalled();
    });

    it('should no-op when agent config is missing', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { ctx, dispatch } = createTestContext({ getConfig: () => null });
      const { publicActions } = createActions(ctx);

      await publicActions.sendMessage('hello');

      expect(mockAgentApi.sendMessage).not.toHaveBeenCalled();
      expect(dispatch).not.toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'streaming',
      });
      expect(consoleError).toHaveBeenCalledWith('[AgentSDK] No agent config provided');
      consoleError.mockRestore();
    });

    it('should not restart streaming when a stream manager already exists', async () => {
      const existingManager = { stop: jest.fn(), start: jest.fn() };
      const { ctx } = createTestContext({
        getChatId: () => 'chat-short',
        getStreamManager: () => existingManager as unknown as UpdateManager,
      });
      const { publicActions } = createActions(ctx);

      await publicActions.sendMessage('follow-up');

      expect(mockAgentApi.sendMessage).toHaveBeenCalled();
      expect(StreamableManager).not.toHaveBeenCalled();
    });
  });

  describe('streamChat error handling', () => {
    it('should reset to idle when initial fetchChat fails', async () => {
      mockAgentApi.fetchChat.mockRejectedValueOnce(new Error('fetch failed'));
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onStatusChange } });
      const { internalActions } = createActions(ctx);

      await internalActions.streamChat('chat-full-id-123');

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'idle',
      });
      expect(onStatusChange).toHaveBeenCalledWith('idle');
      expect(StreamableManager).not.toHaveBeenCalled();
    });

    it('should dispatch UPDATE_CHAT when chats stream events arrive', async () => {
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onStatusChange } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onChat = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chats'
      )?.[1] as (chat: ChatDTO) => void;

      onChat({ id: 'chat-full-id-123', status: ChatStatusBusy, active_run: workingRun } as unknown as ChatDTO);

      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_CHAT',
        payload: expect.objectContaining({ status: ChatStatusBusy }),
      });
      expect(onStatusChange).toHaveBeenCalledWith('streaming');
    });

    it('should keep streaming status when chats event has input_required active_run', async () => {
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onStatusChange } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onChat = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chats'
      )?.[1] as (chat: ChatDTO) => void;

      onChat({
        id: 'chat-full-id-123',
        status: ChatStatusBusy,
        active_run: inputRequiredRun,
      } as unknown as ChatDTO);

      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_CHAT',
        payload: expect.objectContaining({ active_run: inputRequiredRun }),
      });
      expect(onStatusChange).toHaveBeenCalledWith('streaming');
    });

    it('should keep streaming status when agent_runs event enters input_required', async () => {
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onStatusChange } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onAgentRun = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'agent_runs'
      )?.[1] as (run: AgentRunDTO) => void;

      onAgentRun(inputRequiredRun);

      expect(dispatch).toHaveBeenCalledWith({
        type: 'UPDATE_ACTIVE_RUN',
        payload: inputRequiredRun,
      });
      expect(onStatusChange).toHaveBeenCalledWith('streaming');
    });
  });

  describe('pollChat', () => {
    it('should dispatch streaming status when the poll manager starts', async () => {
      const onStatusChange = jest.fn();
      const { ctx, dispatch } = createTestContext({
        getStreamEnabled: () => false,
        callbacks: { onStatusChange },
      });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      pollInstances[0].options.onStart?.();

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'streaming',
      });
      expect(onStatusChange).toHaveBeenCalledWith('streaming');
    });

    it('should fetch full chat when poll status changes', async () => {
      const { ctx: baseCtx } = createTestContext({ getStreamEnabled: () => false });
      const { ctx } = createTestContext({
        getStreamEnabled: () => false,
        client: {
          ...baseCtx.client,
          http: { ...baseCtx.client.http, request: jest.fn().mockResolvedValue({ status: ChatStatusBusy }) },
        },
      });
      const { internalActions } = createActions(ctx);

      mockAgentApi.fetchChat
        .mockResolvedValueOnce({
          id: 'chat-full-id-123',
          status: ChatStatusBusy,
          chat_messages: [],
        } as unknown as ChatDTO)
        .mockResolvedValueOnce({
          id: 'chat-full-id-123',
          status: ChatStatusBusy,
          chat_messages: [makeMessage()],
        } as unknown as ChatDTO);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      await pollInstances[0].options.onData?.({ status: 'idle' });
      await Promise.resolve();

      expect(mockAgentApi.fetchChat).toHaveBeenCalledTimes(2);
    });

    it('should call onError when poll fetch fails', async () => {
      const onError = jest.fn();
      const { ctx: baseCtx } = createTestContext({ getStreamEnabled: () => false });
      const { ctx } = createTestContext({
        getStreamEnabled: () => false,
        callbacks: { onError },
        client: {
          ...baseCtx.client,
          http: { ...baseCtx.client.http, request: jest.fn().mockResolvedValue({ status: ChatStatusBusy }) },
        },
      });
      const { internalActions } = createActions(ctx);

      mockAgentApi.fetchChat
        .mockResolvedValueOnce({
          id: 'chat-full-id-123',
          status: ChatStatusBusy,
          chat_messages: [],
        } as unknown as ChatDTO)
        .mockRejectedValueOnce(new Error('poll fetch failed'));

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      await pollInstances[0].options.onData?.({ status: 'idle' });
      await Promise.resolve();

      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'poll fetch failed' }));
    });

    it('should not refetch chat when poll status is unchanged', async () => {
      const { ctx: baseCtx } = createTestContext({ getStreamEnabled: () => false });
      const { ctx } = createTestContext({
        getStreamEnabled: () => false,
        client: {
          ...baseCtx.client,
          http: { ...baseCtx.client.http, request: jest.fn().mockResolvedValue({ status: ChatStatusBusy }) },
        },
      });
      const { internalActions } = createActions(ctx);

      mockAgentApi.fetchChat.mockResolvedValue({
        id: 'chat-full-id-123',
        status: ChatStatusBusy,
        chat_messages: [],
      } as unknown as ChatDTO);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      await pollInstances[0].options.onData?.({ status: ChatStatusBusy });
      await Promise.resolve();
      const fetchCountAfterFirst = mockAgentApi.fetchChat.mock.calls.length;

      await pollInstances[0].options.onData?.({ status: ChatStatusBusy });
      await Promise.resolve();

      expect(mockAgentApi.fetchChat).toHaveBeenCalledTimes(fetchCountAfterFirst);
    });

    it('should dispatch client tools from poll path when status changes', async () => {
      const handler = jest.fn().mockResolvedValue('poll ok');
      const toolMessage = makeMessage({
        chat_id: 'chat-short',
        tool_invocations: [
          {
            id: 'tool-inv-poll',
            type: ToolTypeClient,
            status: ToolInvocationStatusInProgress,
            function: { name: 'my_tool', arguments: { y: 2 } },
          },
        ],
      });

      const { ctx: baseCtx } = createTestContext({
        getStreamEnabled: () => false,
        getClientToolHandlers: () => new Map([['my_tool', handler]]),
      });
      const { ctx } = createTestContext({
        getStreamEnabled: () => false,
        getClientToolHandlers: () => new Map([['my_tool', handler]]),
        client: {
          ...baseCtx.client,
          http: {
            ...baseCtx.client.http,
            request: jest.fn().mockResolvedValue({ status: ChatStatusBusy }),
          },
        },
      });
      const { internalActions } = createActions(ctx);

      mockAgentApi.fetchChat
        .mockResolvedValueOnce({
          id: 'chat-full-id-123',
          status: ChatStatusBusy,
          chat_messages: [],
        } as unknown as ChatDTO)
        .mockResolvedValueOnce({
          id: 'chat-full-id-123',
          status: ChatStatusBusy,
          chat_messages: [toolMessage],
        } as unknown as ChatDTO);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      await pollInstances[0].options.onData?.({ status: 'idle' });
      await new Promise((resolve) => setImmediate(resolve));

      expect(handler).toHaveBeenCalledWith({ y: 2 });
      expect(mockAgentApi.submitToolResult).toHaveBeenCalledWith(
        ctx.client,
        'tool-inv-poll',
        'poll ok'
      );
    });
  });

  describe('client tool deduplication', () => {
    it('should isolate deduplication per createActions instance', async () => {
      const handlerA = jest.fn().mockResolvedValue('from-a');
      const handlerB = jest.fn().mockResolvedValue('from-b');

      const ctxA = createTestContext({
        getChatId: () => 'chat-a',
        getClientToolHandlers: () => new Map([['my_tool', handlerA]]),
      });
      const ctxB = createTestContext({
        getChatId: () => 'chat-b',
        getClientToolHandlers: () => new Map([['my_tool', handlerB]]),
      });

      const { internalActions: actionsA } = createActions(ctxA.ctx);
      const { internalActions: actionsB } = createActions(ctxB.ctx);

      actionsA.streamChat('chat-a-full');
      actionsB.streamChat('chat-b-full');
      await Promise.resolve();

      const onMessageA = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;
      const onMessageB = streamInstances[1].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      const sharedInvocationId = 'tool-inv-shared';
      const toolPayload = {
        tool_invocations: [
          {
            id: sharedInvocationId,
            type: ToolTypeClient,
            status: ToolInvocationStatusInProgress,
            function: { name: 'my_tool', arguments: {} },
          },
        ],
      };

      onMessageA(makeMessage({ chat_id: 'chat-a', ...toolPayload }));
      onMessageB(makeMessage({ chat_id: 'chat-b', ...toolPayload }));
      await new Promise((resolve) => setImmediate(resolve));

      expect(handlerA).toHaveBeenCalledTimes(1);
      expect(handlerB).toHaveBeenCalledTimes(1);
      expect(mockAgentApi.submitToolResult).toHaveBeenCalledTimes(2);
    });

    it('should not submit the same client tool invocation twice', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const { ctx } = createTestContext({
        getClientToolHandlers: () => new Map([['my_tool', handler]]),
      });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onMessage = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      const toolMessage = makeMessage({
        chat_id: 'chat-short',
        tool_invocations: [
          {
            id: 'tool-inv-dup',
            type: ToolTypeClient,
            status: ToolInvocationStatusAwaitingInput,
            function: { name: 'my_tool', arguments: {} },
          },
        ],
      });

      onMessage(toolMessage);
      onMessage(toolMessage);
      await new Promise((resolve) => setImmediate(resolve));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(mockAgentApi.submitToolResult).toHaveBeenCalledTimes(1);
    });

    it('should clear dedup on sendMessage so the same tool invocation can dispatch on a new turn', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const { ctx } = createTestContext({
        getChatId: () => 'chat-short',
        getClientToolHandlers: () => new Map([['my_tool', handler]]),
      });
      const { publicActions, internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onMessage = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      const toolMessage = makeMessage({
        chat_id: 'chat-short',
        tool_invocations: [
          {
            id: 'tool-inv-turn',
            type: ToolTypeClient,
            status: ToolInvocationStatusAwaitingInput,
            function: { name: 'my_tool', arguments: {} },
          },
        ],
      });

      onMessage(toolMessage);
      await new Promise((resolve) => setImmediate(resolve));
      expect(handler).toHaveBeenCalledTimes(1);

      await publicActions.sendMessage('follow-up');

      onMessage(toolMessage);
      await new Promise((resolve) => setImmediate(resolve));

      expect(handler).toHaveBeenCalledTimes(2);
      expect(mockAgentApi.submitToolResult).toHaveBeenCalledTimes(2);
    });
  });

  describe('publicActions lifecycle', () => {
    it('uploadFile should delegate to the API layer', async () => {
      const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      const { ctx } = createTestContext();
      const { publicActions } = createActions(ctx);

      const result = await publicActions.uploadFile(file);

      expect(mockAgentApi.uploadFile).toHaveBeenCalledWith(ctx.client, file);
      expect(result).toEqual(
        expect.objectContaining({ uri: 'inf://files/uploaded', filename: 'notes.txt' })
      );
    });

    it('reset should stop stream and dispatch RESET', async () => {
      const { ctx, dispatch } = createTestContext();
      const { publicActions } = createActions(ctx);

      await publicActions.sendMessage('hello');
      publicActions.reset();

      expect(dispatch).toHaveBeenCalledWith({ type: 'RESET' });
    });

    it('stopGeneration should call stopChat when chatId exists', async () => {
      const { ctx } = createTestContext({ getChatId: () => 'chat-short' });
      const { publicActions } = createActions(ctx);

      publicActions.stopGeneration();

      expect(mockAgentApi.stopChat).toHaveBeenCalledWith(ctx.client, 'chat-short');
    });

    it('stopGeneration should no-op when there is no chatId', () => {
      const { ctx } = createTestContext({ getChatId: () => null });
      const { publicActions } = createActions(ctx);

      publicActions.stopGeneration();

      expect(mockAgentApi.stopChat).not.toHaveBeenCalled();
    });

    it('submitToolResult should set error state when API fails', async () => {
      mockAgentApi.submitToolResult.mockRejectedValueOnce(new Error('submit failed'));
      const onError = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onError } });
      const { publicActions } = createActions(ctx);

      await expect(publicActions.submitToolResult('inv-1', 'result')).rejects.toThrow(
        'submit failed'
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'error',
      });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'submit failed' }));
    });

    it('clearError should reset error and connection status to idle', () => {
      const { ctx, dispatch } = createTestContext();
      const { publicActions } = createActions(ctx);

      publicActions.clearError();

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: undefined,
      });
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'idle',
      });
    });
    it('reset should allow the same client tool invocation to dispatch again', async () => {
      const handler = jest.fn().mockResolvedValue('ok');
      const { ctx } = createTestContext({
        getClientToolHandlers: () => new Map([['my_tool', handler]]),
      });
      const { publicActions, internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onMessage = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      const toolMessage = makeMessage({
        chat_id: 'chat-short',
        tool_invocations: [
          {
            id: 'tool-inv-reset',
            type: ToolTypeClient,
            status: ToolInvocationStatusAwaitingInput,
            function: { name: 'my_tool', arguments: {} },
          },
        ],
      });

      onMessage(toolMessage);
      await new Promise((resolve) => setImmediate(resolve));
      expect(handler).toHaveBeenCalledTimes(1);

      publicActions.reset();
      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onMessageAfterReset = streamInstances[1].addEventListener.mock.calls.find(
        ([event]) => event === 'chat_messages'
      )?.[1] as (msg: ReturnType<typeof makeMessage>) => void;

      onMessageAfterReset(toolMessage);
      await new Promise((resolve) => setImmediate(resolve));

      expect(handler).toHaveBeenCalledTimes(2);
      expect(mockAgentApi.submitToolResult).toHaveBeenCalledTimes(2);
    });
  });

  describe('HIL tool actions', () => {
    it('approveTool should delegate to the API', async () => {
      const { ctx } = createTestContext();
      const { publicActions } = createActions(ctx);

      await publicActions.approveTool('inv-approve');

      expect(mockAgentApi.approveTool).toHaveBeenCalledWith(ctx.client, 'inv-approve');
    });

    it('rejectTool should pass an optional reason', async () => {
      const { ctx } = createTestContext();
      const { publicActions } = createActions(ctx);

      await publicActions.rejectTool('inv-reject', 'unsafe');

      expect(mockAgentApi.rejectTool).toHaveBeenCalledWith(
        ctx.client,
        'inv-reject',
        'unsafe'
      );
    });

    it('alwaysAllowTool should no-op without a chatId', async () => {
      const { ctx } = createTestContext({ getChatId: () => null });
      const { publicActions } = createActions(ctx);

      await publicActions.alwaysAllowTool('inv-allow', 'my_tool');

      expect(mockAgentApi.alwaysAllowTool).not.toHaveBeenCalled();
    });

    it('alwaysAllowTool should call API when chatId exists', async () => {
      const { ctx } = createTestContext({ getChatId: () => 'chat-short' });
      const { publicActions } = createActions(ctx);

      await publicActions.alwaysAllowTool('inv-allow', 'my_tool');

      expect(mockAgentApi.alwaysAllowTool).toHaveBeenCalledWith(
        ctx.client,
        'chat-short',
        'inv-allow',
        'my_tool'
      );
    });

    it('approveTool should set error state when API fails', async () => {
      mockAgentApi.approveTool.mockRejectedValueOnce(new Error('approve failed'));
      const onError = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onError } });
      const { publicActions } = createActions(ctx);

      await expect(publicActions.approveTool('inv-1')).rejects.toThrow('approve failed');

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'error',
      });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'approve failed' }));
    });

    it('rejectTool should set error state when API fails', async () => {
      mockAgentApi.rejectTool.mockRejectedValueOnce(new Error('reject failed'));
      const onError = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onError } });
      const { publicActions } = createActions(ctx);

      await expect(publicActions.rejectTool('inv-1', 'unsafe')).rejects.toThrow('reject failed');

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'error',
      });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'reject failed' }));
    });

    it('alwaysAllowTool should set error state when API fails', async () => {
      mockAgentApi.alwaysAllowTool.mockRejectedValueOnce(new Error('allow failed'));
      const onError = jest.fn();
      const { ctx, dispatch } = createTestContext({
        getChatId: () => 'chat-short',
        callbacks: { onError },
      });
      const { publicActions } = createActions(ctx);

      await expect(
        publicActions.alwaysAllowTool('inv-1', 'my_tool')
      ).rejects.toThrow('allow failed');

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'error',
      });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'allow failed' }));
    });
  });

  describe('onTurnEnd lifecycle hook', () => {
    it('should call onTurnEnd when stream chat transitions from busy to idle', async () => {
      const onTurnEnd = jest.fn();
      const { ctx } = createTestContext({ callbacks: { onTurnEnd } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onChat = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chats'
      )?.[1] as (chat: ChatDTO) => void;

      onChat({ id: 'chat-full-id-123', status: ChatStatusBusy, active_run: workingRun } as unknown as ChatDTO);
      expect(onTurnEnd).not.toHaveBeenCalled();

      const idleChat = {
        id: 'chat-full-id-123',
        status: ChatStatusIdle,
        chat_messages: [],
      } as unknown as ChatDTO;
      onChat(idleChat);

      expect(onTurnEnd).toHaveBeenCalledTimes(1);
      expect(onTurnEnd).toHaveBeenCalledWith(idleChat);
    });

    it('should call onTurnEnd when stream chat transitions from busy to completed', async () => {
      const onTurnEnd = jest.fn();
      const { ctx } = createTestContext({ callbacks: { onTurnEnd } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onChat = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chats'
      )?.[1] as (chat: ChatDTO) => void;

      onChat({ id: 'chat-full-id-123', status: ChatStatusBusy, active_run: workingRun } as unknown as ChatDTO);

      const completedChat = {
        id: 'chat-full-id-123',
        status: ChatStatusCompleted,
        chat_messages: [],
      } as unknown as ChatDTO;
      onChat(completedChat);

      expect(onTurnEnd).toHaveBeenCalledTimes(1);
      expect(onTurnEnd).toHaveBeenCalledWith(completedChat);
    });

    it('should call onTurnEnd when active_run completes even if chat.status stays busy', async () => {
      const onTurnEnd = jest.fn();
      const { ctx } = createTestContext({ callbacks: { onTurnEnd } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onChat = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chats'
      )?.[1] as (chat: ChatDTO) => void;

      onChat({ id: 'chat-full-id-123', status: ChatStatusBusy, active_run: workingRun } as unknown as ChatDTO);

      const staleBusyChat = {
        id: 'chat-full-id-123',
        status: ChatStatusBusy,
        active_run: completedRun,
        chat_messages: [],
      } as unknown as ChatDTO;
      onChat(staleBusyChat);

      expect(onTurnEnd).toHaveBeenCalledTimes(1);
      expect(onTurnEnd).toHaveBeenCalledWith(staleBusyChat);
    });

    it('should not call onTurnEnd when active_run transitions to input_required', async () => {
      const onTurnEnd = jest.fn();
      const { ctx } = createTestContext({ callbacks: { onTurnEnd } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onChat = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chats'
      )?.[1] as (chat: ChatDTO) => void;

      onChat({ id: 'chat-full-id-123', status: ChatStatusBusy, active_run: workingRun } as unknown as ChatDTO);
      onChat({
        id: 'chat-full-id-123',
        status: ChatStatusBusy,
        active_run: inputRequiredRun,
      } as unknown as ChatDTO);

      expect(onTurnEnd).not.toHaveBeenCalled();
    });

    it('should not call onTurnEnd when chat goes from idle to busy or stays busy', async () => {
      const onTurnEnd = jest.fn();
      mockAgentApi.fetchChat.mockResolvedValueOnce({
        id: 'chat-full-id-123',
        status: ChatStatusIdle,
        chat_messages: [],
      } as unknown as ChatDTO);

      const { ctx } = createTestContext({ callbacks: { onTurnEnd } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onChat = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chats'
      )?.[1] as (chat: ChatDTO) => void;

      onChat({ id: 'chat-full-id-123', status: ChatStatusIdle } as ChatDTO);
      onChat({ id: 'chat-full-id-123', status: ChatStatusBusy, active_run: workingRun } as unknown as ChatDTO);
      onChat({ id: 'chat-full-id-123', status: ChatStatusBusy, active_run: workingRun } as unknown as ChatDTO);

      expect(onTurnEnd).not.toHaveBeenCalled();
    });

    it('should not call onTurnEnd on initial fetch when chat is already idle', async () => {
      const onTurnEnd = jest.fn();
      mockAgentApi.fetchChat.mockResolvedValueOnce({
        id: 'chat-full-id-123',
        status: ChatStatusIdle,
        chat_messages: [],
      } as unknown as ChatDTO);

      const { ctx } = createTestContext({ callbacks: { onTurnEnd } });
      const { internalActions } = createActions(ctx);

      await internalActions.streamChat('chat-full-id-123');

      expect(onTurnEnd).not.toHaveBeenCalled();
    });

    it('should call onTurnEnd again on subsequent busy-to-idle transitions', async () => {
      const onTurnEnd = jest.fn();
      const { ctx } = createTestContext({ callbacks: { onTurnEnd } });
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      const onChat = streamInstances[0].addEventListener.mock.calls.find(
        ([event]) => event === 'chats'
      )?.[1] as (chat: ChatDTO) => void;

      const busyChat = { id: 'chat-full-id-123', status: ChatStatusBusy, active_run: workingRun } as unknown as ChatDTO;
      const idleChat = {
        id: 'chat-full-id-123',
        status: ChatStatusIdle,
        chat_messages: [],
      } as unknown as ChatDTO;

      onChat(busyChat);
      onChat(idleChat);
      onChat(busyChat);
      onChat(idleChat);

      expect(onTurnEnd).toHaveBeenCalledTimes(2);
      expect(onTurnEnd).toHaveBeenNthCalledWith(1, idleChat);
      expect(onTurnEnd).toHaveBeenNthCalledWith(2, idleChat);
    });

    it('should call onTurnEnd on poll path when chat transitions from busy to idle', async () => {
      const onTurnEnd = jest.fn();
      const { ctx: baseCtx } = createTestContext({ getStreamEnabled: () => false });
      const { ctx } = createTestContext({
        getStreamEnabled: () => false,
        callbacks: { onTurnEnd },
        client: {
          ...baseCtx.client,
          http: {
            ...baseCtx.client.http,
            request: jest.fn().mockResolvedValue({ status: ChatStatusBusy }),
          },
        },
      });
      const { internalActions } = createActions(ctx);

      mockAgentApi.fetchChat
        .mockResolvedValueOnce({
          id: 'chat-full-id-123',
          status: ChatStatusBusy,
          active_run: workingRun,
          chat_messages: [],
        } as unknown as ChatDTO)
        .mockResolvedValueOnce({
          id: 'chat-full-id-123',
          status: ChatStatusIdle,
          chat_messages: [],
        } as unknown as ChatDTO);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      expect(onTurnEnd).not.toHaveBeenCalled();

      await pollInstances[0].options.onData?.({ status: ChatStatusIdle });
      await Promise.resolve();

      expect(onTurnEnd).toHaveBeenCalledTimes(1);
      expect(onTurnEnd).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'chat-full-id-123', status: ChatStatusIdle })
      );
    });
  });

  describe('setChatId', () => {
    it('should no-op when the chat id is unchanged', async () => {
      const { ctx } = createTestContext({ getChatId: () => 'chat-short' });
      const { internalActions } = createActions(ctx);

      internalActions.setChatId('chat-short');
      await Promise.resolve();

      expect(StreamableManager).not.toHaveBeenCalled();
    });

    it('should reset and stop stream when chat id is cleared', async () => {
      const { ctx, dispatch } = createTestContext();
      const { internalActions } = createActions(ctx);

      internalActions.streamChat('chat-full-id-123');
      await Promise.resolve();

      internalActions.setChatId(null);

      expect(streamInstances[0].stop).toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith({ type: 'RESET' });
    });

    it('should start streaming when switching to a new chat id', async () => {
      const { ctx, dispatch } = createTestContext({ getChatId: () => null });
      const { internalActions } = createActions(ctx);

      internalActions.setChatId('chat-new');
      await Promise.resolve();

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CHAT_ID',
        payload: 'chat-new',
      });
      expect(StreamableManager).toHaveBeenCalled();
    });
  });

  describe('cancelMessage', () => {
    it('should delegate to the API layer', async () => {
      const { ctx } = createTestContext();
      const { publicActions } = createActions(ctx);

      await publicActions.cancelMessage('msg-queued');

      expect(mockAgentApi.cancelMessage).toHaveBeenCalledWith(ctx.client, 'msg-queued');
    });

    it('should set error state when API fails', async () => {
      mockAgentApi.cancelMessage.mockRejectedValueOnce(new Error('cancel failed'));
      const onError = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onError } });
      const { publicActions } = createActions(ctx);

      await expect(publicActions.cancelMessage('msg-queued')).rejects.toThrow('cancel failed');

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        payload: 'cancel failed',
      });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'cancel failed' }));
    });
  });

  describe('resolveInterrupt', () => {
    it('should call API with interrupt id and decision', async () => {
      const { ctx } = createTestContext();
      const { publicActions } = createActions(ctx);

      await publicActions.resolveInterrupt('int-42', 'allow');

      expect(mockAgentApi.resolveInterrupt).toHaveBeenCalledWith(ctx.client, 'int-42', 'allow');
    });

    it('should set error state when API fails', async () => {
      mockAgentApi.resolveInterrupt.mockRejectedValueOnce(new Error('resolve failed'));
      const onError = jest.fn();
      const { ctx, dispatch } = createTestContext({ callbacks: { onError } });
      const { publicActions } = createActions(ctx);

      await expect(publicActions.resolveInterrupt('int-1', 'deny')).rejects.toThrow(
        'resolve failed'
      );

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CONNECTION_STATUS',
        payload: 'error',
      });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'resolve failed' }));
    });
  });

  describe('loadOlderMessages', () => {
    it('should return false when chatId or cursor is missing', async () => {
      const { ctx } = createTestContext({
        getChatId: () => null,
        getState: () => ({
          chatId: null,
          messages: [],
          connectionStatus: 'idle' as const,
          chat: null,
        }),
      });
      const { publicActions } = createActions(ctx);

      const result = await publicActions.loadOlderMessages();

      expect(result).toBe(false);
      expect(mockAgentApi.fetchMessagesPage).not.toHaveBeenCalled();
    });

    it('should fetch next page and dispatch PREPEND_MESSAGES', async () => {
      const olderMessage = makeMessage({ id: 'msg-old', order: 0, role: 'user' });
      mockAgentApi.fetchMessagesPage.mockResolvedValueOnce({
        items: [olderMessage],
        next_cursor: 'cursor-2',
        has_next: true,
      });

      const { ctx, dispatch } = createTestContext({
        getState: () => ({
          chatId: 'chat-short',
          messages: [makeMessage({ id: 'msg-1', order: 1 })],
          connectionStatus: 'idle' as const,
          chat: null,
          messageCursor: 'cursor-1',
          hasOlderMessages: true,
        }),
      });
      const { publicActions } = createActions(ctx);

      const result = await publicActions.loadOlderMessages();

      expect(mockAgentApi.fetchMessagesPage).toHaveBeenCalledWith(
        ctx.client,
        'chat-short',
        { cursor: 'cursor-1' }
      );
      expect(dispatch).toHaveBeenCalledWith({
        type: 'PREPEND_MESSAGES',
        payload: {
          messages: [olderMessage],
          cursor: 'cursor-2',
          hasMore: true,
        },
      });
      expect(result).toBe(true);
    });

    it('hasOlderMessages getter should reflect state', () => {
      const { ctx } = createTestContext({
        getState: () => ({
          chatId: 'chat-short',
          messages: [],
          connectionStatus: 'idle' as const,
          chat: null,
          hasOlderMessages: true,
        }),
      });
      const { publicActions } = createActions(ctx);

      expect(publicActions.hasOlderMessages).toBe(true);
    });

    it('hasOlderMessages getter should default to false when unset', () => {
      const { ctx } = createTestContext();
      const { publicActions } = createActions(ctx);

      expect(publicActions.hasOlderMessages).toBe(false);
    });

    it('should return has_next without dispatching when the page has no items', async () => {
      mockAgentApi.fetchMessagesPage.mockResolvedValueOnce({
        items: [],
        next_cursor: 'cursor-end',
        has_next: false,
      });

      const { ctx, dispatch } = createTestContext({
        getState: () => ({
          chatId: 'chat-short',
          messages: [makeMessage({ id: 'msg-1', order: 1 })],
          connectionStatus: 'idle' as const,
          chat: null,
          messageCursor: 'cursor-1',
          hasOlderMessages: true,
        }),
      });
      const { publicActions } = createActions(ctx);

      const result = await publicActions.loadOlderMessages();

      expect(result).toBe(false);
      expect(dispatch).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'PREPEND_MESSAGES' })
      );
    });
  });

  describe('streamChat pagination metadata', () => {
    it('should propagate fetchChat pagination metadata through SET_CHAT', async () => {
      mockAgentApi.fetchChat.mockResolvedValueOnce({
        id: 'chat-full-id-123',
        status: ChatStatusIdle,
        chat_messages: [makeMessage({ id: 'msg-1', order: 1 })],
        _messageCursor: 'cursor-page-2',
        _hasOlderMessages: true,
      } as unknown as ChatDTO);

      const { ctx, dispatch } = createTestContext();
      const { internalActions } = createActions(ctx);

      await internalActions.streamChat('chat-full-id-123');

      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_CHAT',
        payload: expect.objectContaining({
          id: 'chat-full-id-123',
          _messageCursor: 'cursor-page-2',
          _hasOlderMessages: true,
        }),
      });
    });
  });
});

describe('getClientToolHandlers', () => {
  it('returns an empty map when config is null', () => {
    expect(getClientToolHandlers(null)).toEqual(new Map());
  });

  it('returns an empty map for template agent refs', () => {
    expect(getClientToolHandlers({ agent: 'inference/my-agent' })).toEqual(new Map());
  });

  it('returns an empty map when ad-hoc config has no tools', () => {
    expect(
      getClientToolHandlers({
        core_app: { ref: 'openrouter/claude@abc' },
        system_prompt: 'test',
      })
    ).toEqual(new Map());
  });

  it('extracts client tool handlers from ad-hoc config tools', () => {
    const handler = jest.fn();
    const map = getClientToolHandlers({
      core_app: { ref: 'openrouter/claude@abc' },
      system_prompt: 'test',
      tools: [
        {
          schema: { name: 'browser', type: ToolTypeClient, description: 'browse' },
          handler,
        },
      ],
    });

    expect(map.size).toBe(1);
    expect(map.get('browser')).toBe(handler);
  });
});
