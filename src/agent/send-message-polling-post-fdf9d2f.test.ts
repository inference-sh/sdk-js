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
 * fdf9d2f: polling refetches only when chat status changes, so a user message
 * sent while the chat is busy must come from the POST /messages response.
 * Only an open SSE (StreamableManager) stream owns ordering with later deltas.
 */
describe('sendMessage POST response with polling vs SSE (fdf9d2f)', () => {
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

  it('guards UPDATE_MESSAGE with instanceof StreamableManager in actions.ts', () => {
    const source = readFileSync(join(__dirname, 'actions.ts'), 'utf8');
    expect(source).toMatch(
      /if \(userMessage && !\(manager instanceof StreamableManager\)\) dispatch\(\{ type: 'UPDATE_MESSAGE', payload: userMessage \}\)/
    );
    expect(source).not.toMatch(
      /if \(userMessage && !manager\) dispatch\(\{ type: 'UPDATE_MESSAGE'/
    );
  });

  it('dispatches the POST user message when PollManager is the active update manager', async () => {
    const pollManager = Object.create(PollManager.prototype) as UpdateManager;
    const { ctx, dispatch } = createSendContext(pollManager);

    await createActions(ctx).publicActions.sendMessage('while busy');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_MESSAGE',
      payload: expect.objectContaining({ id: 'u1', status: ChatMessageStatusQueued }),
    });
  });

  it('does not apply a stale queued POST body when StreamableManager is active', async () => {
    const sseManager = Object.create(StreamableManager.prototype) as UpdateManager;
    const { ctx, dispatch } = createSendContext(sseManager);

    await createActions(ctx).publicActions.sendMessage('follow-up');

    expect(dispatch).not.toHaveBeenCalledWith({
      type: 'UPDATE_MESSAGE',
      payload: expect.objectContaining({
        id: 'u1',
        status: ChatMessageStatusQueued,
      }),
    });
  });

  it('still applies the POST user message for a non-SSE manager object (poll fallback)', async () => {
    const genericManager = { stop: jest.fn(), start: jest.fn() } as unknown as UpdateManager;
    const { ctx, dispatch } = createSendContext(genericManager);

    await createActions(ctx).publicActions.sendMessage('follow-up');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_MESSAGE',
      payload: expect.objectContaining({ id: 'u1' }),
    });
  });
});
