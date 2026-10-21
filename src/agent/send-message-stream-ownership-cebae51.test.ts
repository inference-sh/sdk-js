import { readFileSync } from 'fs';
import { join } from 'path';
import type { ActionsContext, UpdateManager } from './types.js';
import type { AgentOptions, ChatMessageDTO } from '../types.js';
import { ChatMessageStatusQueued } from '../types.js';
import { createActions } from './actions.js';
import * as agentApi from './api.js';
import { StreamableManager } from '../http/streamable.js';
import { PollManager } from '../http/poll.js';

jest.mock('./api');
jest.mock('../http/streamable');
jest.mock('../http/poll');

const mockAgentApi = agentApi as jest.Mocked<typeof agentApi>;

function makeUserMessage(overrides: Record<string, unknown> = {}): ChatMessageDTO {
  return {
    id: 'u1',
    chat_id: 'chat-full-id-123',
    role: 'user',
    status: ChatMessageStatusQueued,
    ...overrides,
  } as unknown as ChatMessageDTO;
}

function createSendContext(streamManager?: UpdateManager): {
  ctx: ActionsContext;
  dispatch: jest.Mock;
} {
  const dispatch = jest.fn();
  const config: AgentOptions = {
    core_app: { ref: 'openrouter/claude@abc' },
    system_prompt: 'test',
  };

  const ctx: ActionsContext = {
    client: {
      http: {
        request: jest.fn(),
        fetch: jest.fn(),
        getStreamDefault: jest.fn(() => true),
        getPollIntervalMs: jest.fn(() => 50),
      },
      files: { upload: jest.fn() },
    },
    dispatch,
    getState: () => ({ chatId: 'chat-short', messages: [], connectionStatus: 'idle' as const, chat: null }),
    getConfig: () => config,
    getChatId: () => 'chat-short',
    getClientToolHandlers: () => new Map(),
    getStreamManager: () => streamManager,
    setStreamManager: jest.fn(),
    getStreamEnabled: () => true,
    getPollIntervalMs: () => 50,
    callbacks: {},
  };

  return { ctx, dispatch };
}

/**
 * cebae51: with an open chat stream, the POST /messages response is only the
 * message as created. The stream may already have advanced it (e.g. queued →
 * ready when a wait ends); applying the response would regress local state.
 */
describe('sendMessage POST response vs open stream (cebae51)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (StreamableManager as jest.Mock).mockImplementation(() => ({
      addEventListener: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    }));
    (PollManager as jest.Mock).mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    }));
    mockAgentApi.chatStreamRequest.mockReturnValue(jest.fn());
    mockAgentApi.sendMessage.mockResolvedValue({
      chatId: 'chat-full-id-123',
      userMessage: makeUserMessage(),
    });
  });

  it('guards UPDATE_MESSAGE from the POST body behind !streamManager in actions.ts', () => {
    const source = readFileSync(join(__dirname, 'actions.ts'), 'utf8');
    expect(source).toMatch(
      /if \(userMessage && !streamManager\) dispatch\(\{ type: 'UPDATE_MESSAGE', payload: userMessage \}\)/
    );
    expect(source).not.toMatch(/Add user message from POST response immediately/);
  });

  it('does not dispatch a stale queued user message when a stream manager is active', async () => {
    const streamManager = { stop: jest.fn() } as unknown as UpdateManager;
    const { ctx, dispatch } = createSendContext(streamManager);

    await createActions(ctx).publicActions.sendMessage('follow-up');

    expect(mockAgentApi.sendMessage).toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith({
      type: 'UPDATE_MESSAGE',
      payload: expect.objectContaining({
        id: 'u1',
        status: ChatMessageStatusQueued,
      }),
    });
  });

  it('still applies the POST user message when no stream is open yet', async () => {
    const dispatch = jest.fn();
    const config: AgentOptions = {
      core_app: { ref: 'openrouter/claude@abc' },
      system_prompt: 'test',
    };
    const ctx: ActionsContext = {
      ...createSendContext(undefined).ctx,
      dispatch,
      getChatId: () => null,
      getConfig: () => config,
    };

    await createActions(ctx).publicActions.sendMessage('hello');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_MESSAGE',
      payload: expect.objectContaining({ id: 'u1', status: ChatMessageStatusQueued }),
    });
  });
});
