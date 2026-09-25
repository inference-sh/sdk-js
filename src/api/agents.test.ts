import { HttpClient } from '../http/client';
import { StreamableManager } from '../http/streamable';
import { PollManager } from '../http/poll';
import {
  ChannelTypeSlack,
  ChatStatusBusy,
  ChatStatusIdle,
  FileDTO,
  ToolInvocationStatusAwaitingInput,
  ToolInvocationStatusInProgress,
  ToolTypeClient,
  AgentRunStateCompleted,
  AgentRunStateWorking,
} from '../types';
import type { AgentRunDTO, ChannelContext } from '../types';
import { FilesAPI } from './files';
import { AgentsAPI } from './agents';

const workingRun = { state: AgentRunStateWorking } as AgentRunDTO;
const completedRun = { state: AgentRunStateCompleted } as AgentRunDTO;
const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    chat_id: 'chat-1',
    role: 'assistant',
    content: 'hello',
    ...overrides,
  };
}

function mockNdjsonStream(chunks: string[]) {
  let chunkIndex = 0;
  const mockReader = {
    read: jest.fn().mockImplementation(async () => {
      if (chunkIndex >= chunks.length) {
        return { done: true, value: undefined };
      }
      return { done: false, value: new TextEncoder().encode(chunks[chunkIndex++]) };
    }),
    releaseLock: jest.fn(),
  };
  return {
    ok: true,
    status: 200,
    body: { getReader: () => mockReader },
  };
}

describe('Agent.sendMessage (polling mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const agent = () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: false,
      pollIntervalMs: 20,
    });
    return new AgentsAPI(http, new FilesAPI(http)).create('my-agent');
  };

  it('should wait until chat is idle when stream is false', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });

    mockJsonResponse({
      user_message: userMessage, assistant_message: assistantMessage,
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle, chat_messages: [],
    });

    const onChat = jest.fn();
    const result = await agent().sendMessage('hello', { stream: false, onChat });

    expect(result.userMessage).toEqual(userMessage);
    expect(result.assistantMessage).toEqual(assistantMessage);
    expect(onChat).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'chat-1', status: ChatStatusIdle })
    );
  });

  it('should forward harness work_dir metadata through onChat while polling', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });

    mockJsonResponse({
      user_message: userMessage, assistant_message: assistantMessage,
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [],
      harness_session_id: 'sess-poll',
      work_dir: '/data/workspace',
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [],
      harness_session_id: 'sess-poll',
      work_dir: '/data/workspace',
    });

    const onChat = jest.fn();
    await agent().sendMessage('hello', { stream: false, onChat });

    expect(onChat).toHaveBeenCalledWith(
      expect.objectContaining({
        harness_session_id: 'sess-poll',
        work_dir: '/data/workspace',
      })
    );
  });

  it('should treat chat as idle when active_run is completed even if status is still busy', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });

    mockJsonResponse({
      user_message: userMessage, assistant_message: assistantMessage,
    });
    mockJsonResponse({ status: ChatStatusBusy });
    // Stale derived status: chat.status still busy while the run has finished
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: completedRun,
      chat_messages: [],
    });

    const onChat = jest.fn();
    const result = await agent().sendMessage('hello', { stream: false, onChat });

    expect(result.userMessage).toEqual(userMessage);
    expect(result.assistantMessage).toEqual(assistantMessage);
    expect(onChat).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'chat-1',
        status: ChatStatusBusy,
        active_run: completedRun,
      })
    );
    // Should not keep polling for a status flip — active_run.state drives busy detection
    const statusPolls = mockFetch.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('/status')
    );
    expect(statusPolls.length).toBe(1);
  });

  it('should skip full GET /chats when poll status is unchanged', async () => {
    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [],
    });
    // Same status again — pollUntilIdle should return a stub without fetching full chat
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [],
    });

    await agent().sendMessage('hello', { stream: false });

    const fullChatGets = mockFetch.mock.calls.filter(
      ([url, init]) =>
        String(url).includes('/chats/chat-1') &&
        !String(url).includes('/status') &&
        !String(url).includes('/stop') &&
        (init as RequestInit).method === 'GET'
    );
    expect(fullChatGets).toHaveLength(2);
  });

  it('should dispatch onToolCall for in_progress client tool invocations', async () => {
    const toolInvocation = {
      id: 'tool-inv-progress',
      type: ToolTypeClient,
      status: ToolInvocationStatusInProgress,
      function: { name: 'my_tool', arguments: { x: 2 } },
    };
    const messageWithTool = makeMessage({ tool_invocations: [toolInvocation] });

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [messageWithTool],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [messageWithTool],
    });

    const onMessage = jest.fn();
    const onToolCall = jest.fn();
    await agent().sendMessage('run tool', { stream: false, onMessage, onToolCall });

    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onToolCall).toHaveBeenCalledWith({
      id: 'tool-inv-progress',
      name: 'my_tool',
      args: { x: 2 },
    });
  });

  it('should isolate tool dedup between separate Agent instances', async () => {
    const toolInvocation = {
      id: 'tool-inv-shared',
      type: ToolTypeClient,
      status: ToolInvocationStatusInProgress,
      function: { name: 'my_tool', arguments: { x: 1 } },
    };
    const messageWithTool = makeMessage({ tool_invocations: [toolInvocation] });

    const agentA = agent();
    const agentB = agent();
    const onToolCallA = jest.fn();
    const onToolCallB = jest.fn();
    const onMessageA = jest.fn();
    const onMessageB = jest.fn();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-a', role: 'user' }),
      assistant_message: makeMessage({ id: 'asst-a' }),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [messageWithTool],
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [messageWithTool],
    });

    await agentA.sendMessage('run tool', {
      stream: false,
      onMessage: onMessageA,
      onToolCall: onToolCallA,
    });

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-b', role: 'user' }),
      assistant_message: makeMessage({ id: 'asst-b', chat_id: 'chat-2' }),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-2',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [messageWithTool],
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-2',
      status: ChatStatusIdle,
      chat_messages: [messageWithTool],
    });

    await agentB.sendMessage('run tool', {
      stream: false,
      onMessage: onMessageB,
      onToolCall: onToolCallB,
    });

    expect(onToolCallA).toHaveBeenCalledTimes(1);
    expect(onToolCallB).toHaveBeenCalledTimes(1);
    expect(onToolCallA).toHaveBeenCalledWith({
      id: 'tool-inv-shared',
      name: 'my_tool',
      args: { x: 1 },
    });
    expect(onToolCallB).toHaveBeenCalledWith({
      id: 'tool-inv-shared',
      name: 'my_tool',
      args: { x: 1 },
    });
  });

  it('should dispatch onToolCall once per client tool invocation', async () => {
    const toolInvocation = {
      id: 'tool-inv-1',
      type: ToolTypeClient,
      status: ToolInvocationStatusAwaitingInput,
      function: { name: 'my_tool', arguments: { x: 1 } },
    };
    const messageWithTool = makeMessage({ tool_invocations: [toolInvocation] });

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
        status: ChatStatusBusy,
        active_run: workingRun,
        chat_messages: [messageWithTool],
    });
    // Same status again — stub poll should not re-dispatch tool
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle, chat_messages: [messageWithTool],
    });

    const onMessage = jest.fn();
    const onToolCall = jest.fn();
    await agent().sendMessage('run tool', { stream: false, onMessage, onToolCall });

    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onToolCall).toHaveBeenCalledWith({
      id: 'tool-inv-1',
      name: 'my_tool',
      args: { x: 1 },
    });
  });

  it('should call onMessage for each chat message during polling', async () => {
    const msg1 = makeMessage({ id: 'msg-1', content: 'first' });
    const msg2 = makeMessage({ id: 'msg-2', content: 'second' });

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [msg1, msg2],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [msg1, msg2],
    });

    const onMessage = jest.fn();
    await agent().sendMessage('hello', { stream: false, onMessage });

    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-1', content: 'first' }));
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-2', content: 'second' }));
  });

  it('should return chat output from run() after polling completes', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage();

    mockJsonResponse({
      user_message: userMessage, assistant_message: assistantMessage,
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusBusy, active_run: workingRun,
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle,
    });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle, output: { answer: 42 },
    });

    const output = await agent().run('compute');

    expect(output).toEqual({ answer: 42 });
  });

  it('should return null from run() when the chat has no finish output', async () => {
    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle, output: null });

    const output = await agent().run('no finish tool');

    expect(output).toBeNull();
  });

  it('should warn on repeated poll errors without resolving sendMessage', async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockFetch.mockRejectedValue(new Error('status endpoint down'));

    const sendPromise = agent().sendMessage('hello', { stream: false });

    for (let i = 0; i < 6; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(20);
      await Promise.resolve();
    }

    expect(warnSpy).toHaveBeenCalledWith('[Agent] Poll error:', expect.any(Error));

    let settled = false;
    sendPromise.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);

    warnSpy.mockRestore();
    jest.useRealTimers();
  });

  it('should reject with signal.reason and stop polling when aborted mid-turn', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });
    let statusPollCount = 0;

    mockFetch.mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({ user_message: userMessage, assistant_message: assistantMessage })
            ),
        });
      }
      if (urlStr.includes('/status')) {
        statusPollCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ status: ChatStatusBusy })),
        });
      }
      if (urlStr.includes('/chats/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 'chat-1',
                status: ChatStatusBusy,
                active_run: workingRun,
                chat_messages: [],
              })
            ),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    const agentInstance = agent();
    const reason = new Error('operator needed');
    const turn = agentInstance.sendMessage('hello', { stream: false, signal: controller.signal });

    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(20);
      await Promise.resolve();
    }

    const statusPollsBeforeAbort = statusPollCount;
    controller.abort(reason);

    await expect(turn).rejects.toBe(reason);
    expect(agentInstance.currentChatId).toBe('chat-1');

    jest.advanceTimersByTime(200);
    await Promise.resolve();
    expect(statusPollCount).toBe(statusPollsBeforeAbort);

    jest.useRealTimers();
  });

  it('should reject before POST when the signal is already aborted (polling mode)', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      agent().sendMessage('hello', { stream: false, signal: controller.signal })
    ).rejects.toBe(controller.signal.reason);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should allow aborting a turn parked on client tool approval', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const toolInvocation = {
      id: 'tool-inv-await',
      type: ToolTypeClient,
      status: ToolInvocationStatusAwaitingInput,
      function: { name: 'approve_action', arguments: { step: 1 } },
    };
    const messageWithTool = makeMessage({ tool_invocations: [toolInvocation] });
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });

    mockFetch.mockImplementation((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({ user_message: userMessage, assistant_message: assistantMessage })
            ),
        });
      }
      if (urlStr.includes('/status')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ status: ChatStatusBusy })),
        });
      }
      if (urlStr.includes('/chats/') && !urlStr.includes('/status')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                id: 'chat-1',
                status: ChatStatusBusy,
                active_run: workingRun,
                chat_messages: [messageWithTool],
              })
            ),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${urlStr}`));
    });

    const reason = new Error('cannot resolve approval in this environment');
    const turn = agent().sendMessage('approve this', { stream: false, signal: controller.signal });

    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      jest.advanceTimersByTime(20);
      await Promise.resolve();
    }

    controller.abort(reason);
    await expect(turn).rejects.toBe(reason);
    jest.useRealTimers();
  });
});

describe('Agent.sendMessage (streaming mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const streamingAgent = () => {
    const http = new HttpClient({ apiKey: 'test-key', stream: true });
    return new AgentsAPI(http, new FilesAPI(http)).create('my-agent');
  };

  it('should forward agent_runs output through onChat callbacks', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });
    const completedRun = {
      state: AgentRunStateCompleted,
      output: { answer: 42 },
    } as AgentRunDTO;

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: userMessage, assistant_message: assistantMessage,
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'agent_runs', data: workingRun })}\n`,
          `${JSON.stringify({ event: 'agent_runs', data: completedRun })}\n`,
        ])
      );
    });

    const onChat = jest.fn();
    await streamingAgent().sendMessage('hello', { onChat });

    expect(onChat).toHaveBeenCalledWith({ active_run: completedRun });
    expect(onChat).toHaveBeenCalledWith(
      expect.objectContaining({ active_run: expect.objectContaining({ output: { answer: 42 } }) })
    );
  });

  it('should wait until chat is idle via typed stream events', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: userMessage, assistant_message: assistantMessage,
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusBusy, active_run: workingRun } })}\n`,
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
        ])
      );
    });

    const onChat = jest.fn();
    const result = await streamingAgent().sendMessage('hello', { onChat });

    expect(result.userMessage).toEqual(userMessage);
    expect(onChat).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'chat-1', status: ChatStatusIdle })
    );

    const streamCall = mockFetch.mock.calls.find(([url]) => String(url).includes('/stream'));
    expect(streamCall?.[1]).toEqual(expect.objectContaining({ credentials: 'omit' }));
  });

  it('should forward harness work_dir metadata through onChat while streaming', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: userMessage, assistant_message: assistantMessage,
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({
            event: 'chats',
            data: {
              id: 'chat-1',
              status: ChatStatusBusy,
              active_run: workingRun,
              harness_session_id: 'sess-stream',
              work_dir: '/remote/project',
            },
          })}\n`,
          `${JSON.stringify({
            event: 'chats',
            data: {
              id: 'chat-1',
              status: ChatStatusIdle,
              harness_session_id: 'sess-stream',
              work_dir: '/remote/project',
            },
          })}\n`,
        ])
      );
    });

    const onChat = jest.fn();
    await streamingAgent().sendMessage('hello', { onChat });

    expect(onChat).toHaveBeenCalledWith(
      expect.objectContaining({
        harness_session_id: 'sess-stream',
        work_dir: '/remote/project',
      })
    );
  });

  it('should not resolve a follow-up turn on the previous turn\'s idle snapshot', async () => {
    // Turn 1 establishes the chat. Turn 2 opens the stream before the POST; the
    // stream's first snapshot is still idle from turn 1 and must not end turn 2.
    const runResponse = (n: number) => ({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            user_message: makeMessage({ id: `user-${n}`, role: 'user' }),
            assistant_message: makeMessage({ id: `asst-${n}` }),
          })
        ),
    });
    const idle = JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } });
    const busy = JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusBusy, active_run: workingRun } });
    const reply2 = JSON.stringify({ event: 'chat_messages', data: makeMessage({ id: 'asst-2', content: 'second', status: 'ready' }) });

    let turn = 0;
    let streams = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) return Promise.resolve(runResponse(++turn));
      // Stream 1 belongs to turn 1; stream 2 is opened by turn 2 *before* its POST.
      if (++streams === 1) return Promise.resolve(mockNdjsonStream([`${busy}\n`, `${idle}\n`]));
      // Turn 2: stale idle first, then the real run.
      return Promise.resolve(mockNdjsonStream([`${idle}\n`, `${busy}\n`, `${reply2}\n`, `${idle}\n`]));
    });

    const agent = streamingAgent();
    await agent.sendMessage('first', { onChat: jest.fn() });

    const onMessage = jest.fn();
    await agent.sendMessage('second', { onMessage });

    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'asst-2', content: 'second' }));
  });

  it('should end a follow-up turn on a terminal assistant message when busy was never observed', async () => {
    const runResponse = (n: number) => ({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            user_message: makeMessage({ id: `user-${n}`, role: 'user' }),
            assistant_message: makeMessage({ id: `asst-${n}` }),
          })
        ),
    });
    const idle = JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } });
    const busy = JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusBusy, active_run: workingRun } });
    const reply2 = JSON.stringify({ event: 'chat_messages', data: makeMessage({ id: 'asst-2', content: 'fast', status: 'ready' }) });

    let turn = 0;
    let streams = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) return Promise.resolve(runResponse(++turn));
      if (++streams === 1) return Promise.resolve(mockNdjsonStream([`${busy}\n`, `${idle}\n`]));
      // Run finished between snapshots: only the message proves the turn happened.
      return Promise.resolve(mockNdjsonStream([`${idle}\n`, `${reply2}\n`]));
    });

    const agent = streamingAgent();
    await agent.sendMessage('first', { onChat: jest.fn() });
    const onMessage = jest.fn();
    await agent.sendMessage('second', { onMessage });

    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'asst-2' }));
  });

  it('should dispatch onToolCall for in_progress tools from chat_messages stream events', async () => {
    const toolInvocation = {
      id: 'tool-inv-progress',
      type: ToolTypeClient,
      status: ToolInvocationStatusInProgress,
      function: { name: 'my_tool', arguments: { x: 2 } },
    };
    const messageWithTool = makeMessage({ tool_invocations: [toolInvocation] });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: makeMessage({ id: 'user-1', role: 'user' }),
                assistant_message: makeMessage(),
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'chat_messages', data: messageWithTool })}\n`,
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
        ])
      );
    });

    const onToolCall = jest.fn();
    await streamingAgent().sendMessage('run tool', { onToolCall });

    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onToolCall).toHaveBeenCalledWith({
      id: 'tool-inv-progress',
      name: 'my_tool',
      args: { x: 2 },
    });
  });

  it('should dispatch onToolCall from chat_messages stream events', async () => {
    const toolInvocation = {
      id: 'tool-inv-1',
      type: ToolTypeClient,
      status: ToolInvocationStatusAwaitingInput,
      function: { name: 'my_tool', arguments: { x: 1 } },
    };
    const messageWithTool = makeMessage({ tool_invocations: [toolInvocation] });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: makeMessage({ id: 'user-1', role: 'user' }),
                  assistant_message: makeMessage(),
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'chat_messages', data: messageWithTool })}\n`,
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
        ])
      );
    });

    const onToolCall = jest.fn();
    await streamingAgent().sendMessage('run tool', { onToolCall });

    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onToolCall).toHaveBeenCalledWith({
      id: 'tool-inv-1',
      name: 'my_tool',
      args: { x: 1 },
    });
  });

  it('should accumulate delta events per message and surface them through onDelta', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1', status: 'in_progress' });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: userMessage, assistant_message: assistantMessage,
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusBusy, active_run: workingRun } })}\n`,
          `${JSON.stringify({ event: 'delta', data: { delta: { response: 'Hel' }, seq: 1, resource_id: 'asst-1' } })}\n`,
          // A delta for a message this stream cannot attribute is dropped, never merged into asst-1.
          `${JSON.stringify({ event: 'delta', data: { delta: { response: 'XXX' }, seq: 1 } })}\n`,
          `${JSON.stringify({ event: 'delta', data: { delta: { response: 'lo' }, seq: 2, resource_id: 'asst-1' } })}\n`,
          `${JSON.stringify({ event: 'delta', data: { delta: { response: 'Other' }, seq: 1, resource_id: 'asst-2' } })}\n`,
          `${JSON.stringify({ event: 'chat_messages', data: makeMessage({ id: 'asst-1', status: 'ready' }) })}\n`,
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
        ])
      );
    });

    const onDelta = jest.fn();
    await streamingAgent().sendMessage('hello', { onDelta });

    expect(onDelta.mock.calls.map(([d]) => [d.messageId, d.delta.response, d.output.response, d.seq])).toEqual([
      ['asst-1', 'Hel', 'Hel', 1],
      ['asst-1', 'lo', 'Hello', 2],
      ['asst-2', 'Other', 'Other', 1],
    ]);
  });

  it('should not invoke onDelta when stream is false', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });

    mockJsonResponse({
      user_message: userMessage,
      assistant_message: assistantMessage,
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [],
    });

    const onDelta = jest.fn();
    await streamingAgent().sendMessage('hello', { stream: false, onDelta });

    expect(onDelta).not.toHaveBeenCalled();
  });

  it('should reset per-message accumulation after the assistant message is terminal', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1', status: 'in_progress' });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: userMessage,
                assistant_message: assistantMessage,
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'delta', data: { delta: { response: 'Hel' }, seq: 1, resource_id: 'asst-1' } })}\n`,
          `${JSON.stringify({ event: 'delta', data: { delta: { response: 'lo' }, seq: 2, resource_id: 'asst-1' } })}\n`,
          `${JSON.stringify({ event: 'chat_messages', data: makeMessage({ id: 'asst-1', status: 'ready' }) })}\n`,
          `${JSON.stringify({ event: 'delta', data: { delta: { response: 'late' }, seq: 3, resource_id: 'asst-1' } })}\n`,
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
        ])
      );
    });

    const onDelta = jest.fn();
    await streamingAgent().sendMessage('hello', { onDelta });

    expect(onDelta.mock.calls.map(([d]) => [d.messageId, d.output.response, d.seq])).toEqual([
      ['asst-1', 'Hel', 1],
      ['asst-1', 'Hello', 2],
      ['asst-1', 'late', 3],
    ]);
  });

  it('should not surface previous turn text through onDelta on a tool-call-only follow-up', async () => {
    const runResponse = (n: number) => ({
      ok: true,
      status: 200,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            user_message: makeMessage({ id: `user-${n}`, role: 'user' }),
            assistant_message: makeMessage({ id: `asst-${n}` }),
          })
        ),
    });
    const idle = JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } });
    const busy = JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusBusy, active_run: workingRun } });
    const turn1Deltas = [
      `${JSON.stringify({ event: 'delta', data: { delta: { response: 'First' }, seq: 1, resource_id: 'asst-1' } })}\n`,
      `${JSON.stringify({ event: 'chat_messages', data: makeMessage({ id: 'asst-1', status: 'ready', content: 'First' }) })}\n`,
    ];
    const toolOnly = makeMessage({
      id: 'asst-2',
      content: '',
      tool_invocations: [{
        id: 'tool-1',
        type: ToolTypeClient,
        status: ToolInvocationStatusAwaitingInput,
        function: { name: 'lookup', arguments: { q: 'x' } },
      }],
    });

    let turn = 0;
    let streams = 0;
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) return Promise.resolve(runResponse(++turn));
      if (++streams === 1) {
        return Promise.resolve(mockNdjsonStream([`${busy}\n`, ...turn1Deltas, `${idle}\n`]));
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${idle}\n`,
          `${busy}\n`,
          `${JSON.stringify({ event: 'chat_messages', data: toolOnly })}\n`,
          `${idle}\n`,
        ])
      );
    });

    const agent = streamingAgent();
    const onDeltaTurn1 = jest.fn();
    await agent.sendMessage('first', { onDelta: onDeltaTurn1 });
    expect(onDeltaTurn1).toHaveBeenCalledTimes(1);
    expect(onDeltaTurn1.mock.calls[0][0].output.response).toBe('First');

    const onDeltaTurn2 = jest.fn();
    await agent.sendMessage('second', { onDelta: onDeltaTurn2 });
    expect(onDeltaTurn2).not.toHaveBeenCalled();
  });

  it('should wait for the turn when onDelta is the only callback', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });
    let streamOpened = false;

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: userMessage, assistant_message: assistantMessage,
              })
            ),
        });
      }
      streamOpened = true;
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
        ])
      );
    });

    await streamingAgent().sendMessage('hello', { onDelta: () => {} });
    expect(streamOpened).toBe(true);
  });

  it('should reject with signal.reason and stop the stream when aborted mid-turn', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });
    const controller = new AbortController();
    let releaseStream: () => void = () => {};

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: userMessage, assistant_message: assistantMessage,
              })
            ),
        });
      }
      // A stream that never ends on its own: one busy snapshot, then hangs.
      let sent = false;
      const reader = {
        read: jest.fn().mockImplementation(() => {
          if (!sent) {
            sent = true;
            return Promise.resolve({
              done: false,
              value: new TextEncoder().encode(`${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusBusy, active_run: workingRun } })}\n`),
            });
          }
          return new Promise((resolve) => { releaseStream = () => resolve({ done: true, value: undefined }); });
        }),
        releaseLock: jest.fn(),
      };
      return Promise.resolve({ ok: true, status: 200, body: { getReader: () => reader } });
    });

    const agent = streamingAgent();
    const turn = agent.sendMessage('hello', { onChat: () => {}, signal: controller.signal });
    await new Promise((r) => setTimeout(r, 10));
    const reason = new Error('operator needed');
    controller.abort(reason);

    await expect(turn).rejects.toBe(reason);
    releaseStream();
    // The stream was torn down: a later sendMessage on the same chat opens a fresh one.
    expect(agent.currentChatId).toBe('chat-1');
  });

  it('should reject before POST when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(streamingAgent().sendMessage('hello', { signal: controller.signal })).rejects.toBe(controller.signal.reason);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return immediately without waiting when stream is true and no callbacks', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage({ id: 'asst-1' });

    mockJsonResponse({
      user_message: userMessage,
      assistant_message: assistantMessage,
    });

    const result = await streamingAgent().sendMessage('hello');

    expect(result.userMessage).toEqual(userMessage);
    expect(result.assistantMessage).toEqual(assistantMessage);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('/agents/run');
  });

  it('should open the stream before POST when continuing an existing chat', async () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: true,
      pollIntervalMs: 20,
    });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create('my-agent');

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle, chat_messages: [],
    });

    await agentInstance.sendMessage('first', { stream: false });

    const callOrder: string[] = [];
    mockFetch.mockImplementation((url: string) => {
      callOrder.push(url);
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: makeMessage({ id: 'user-2', role: 'user' }),
                  assistant_message: makeMessage({ id: 'asst-2' }),
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusBusy, active_run: workingRun } })}\n`,
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
        ])
      );
    });

    await agentInstance.sendMessage('second', { onChat: jest.fn() });

    const streamIndex = callOrder.findIndex((u) => u.includes('/stream'));
    const runIndex = callOrder.findIndex((u) => u.includes('/agents/run'));
    expect(streamIndex).toBeGreaterThanOrEqual(0);
    expect(runIndex).toBeGreaterThanOrEqual(0);
    expect(streamIndex).toBeLessThan(runIndex);
  });
});

describe('Agent.sendMessage (file attachments)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const agent = () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: false,
      pollIntervalMs: 20,
    });
    return new AgentsAPI(http, new FilesAPI(http)).create('my-agent');
  };

  it('should route image and non-image URIs into images vs files on the run request', async () => {
    const imageFile: FileDTO = {
      id: 'file-img',
      uri: 'inf://files/img',
      filename: 'photo.png',
      content_type: 'image/png',
    } as FileDTO;
    const docFile: FileDTO = {
      id: 'file-doc',
      uri: 'inf://files/doc',
      filename: 'notes.pdf',
      content_type: 'application/pdf',
    } as FileDTO;

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle, chat_messages: [],
    });

    await agent().sendMessage('see attachments', {
      stream: false,
      files: [imageFile, docFile],
    });

    const runCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/agents/run')
    ) as [string, RequestInit];
    const body = JSON.parse(String(runCall[1].body));

    expect(body.input.images).toEqual(['inf://files/img']);
    expect(body.input.files).toEqual(['inf://files/doc']);
    expect(mockFetch.mock.calls.filter(([url]) => String(url).includes('/files')).length).toBe(0);
  });

  it('should upload Blob attachments before POST /agents/run', async () => {
    const fileRecord = {
      id: 'file-blob',
      uri: 'inf://files/blob-direct',
      upload_url: 'https://upload.example.com/put',
      content_type: 'image/png',
    };

    mockJsonResponse([fileRecord]);
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [] });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle, chat_messages: [] });

    const blob = new Blob(['png-bytes'], { type: 'image/png' });
    await agent().sendMessage('see image', { stream: false, files: [blob] });

    const fileCreateCall = mockFetch.mock.calls.find(
      ([url]) => String(url).includes('/files') && !String(url).includes('upload.example.com')
    );
    expect(fileCreateCall).toBeDefined();

    const runCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/agents/run')
    ) as [string, RequestInit];
    const body = JSON.parse(String(runCall[1].body));

    expect(body.input.images).toEqual(['inf://files/blob-direct']);
    expect(body.input.files).toBeUndefined();
  });
});

describe('Agent.sendMessage channel_context passthrough', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const slackContext: ChannelContext = {
    channel_type: ChannelTypeSlack,
    channel_metadata: { channel_id: 'C123', thread_ts: '1234.5678' },
  };

  function mockRunAndPoll() {
    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [] });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle, chat_messages: [] });
  }

  function runBody(): Record<string, unknown> {
    const runCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/agents/run')
    ) as [string, RequestInit];
    return JSON.parse(String(runCall[1].body)) as Record<string, unknown>;
  }

  it('should POST channel_context when replying through a routed channel', async () => {
    const http = new HttpClient({ apiKey: 'test-key', stream: false, pollIntervalMs: 20 });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create('inference/my-agent');

    mockRunAndPoll();
    await agentInstance.sendMessage('hello from slack', { stream: false, channel_context: slackContext });

    expect(runBody().channel_context).toEqual(slackContext);
  });

  it('should omit channel_context from the body when not provided', async () => {
    const http = new HttpClient({ apiKey: 'test-key', stream: false, pollIntervalMs: 20 });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create({
      core_app: { ref: 'openrouter/claude@latest' },
      name: 'adhoc',
    });

    mockRunAndPoll();
    await agentInstance.sendMessage('sdk chat', { stream: false });

    expect(runBody()).not.toHaveProperty('channel_context');
  });

  it('should include channel_context on ad-hoc agent_config runs', async () => {
    const http = new HttpClient({ apiKey: 'test-key', stream: false, pollIntervalMs: 20 });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create({
      core_app: { ref: 'openrouter/claude@latest' },
      name: 'adhoc',
    });

    mockRunAndPoll();
    await agentInstance.sendMessage('thread reply', { stream: false, channel_context: slackContext });

    const body = runBody();
    expect(body.agent_config).toBeDefined();
    expect(body.channel_context).toEqual(slackContext);
  });
});

describe('Agent.sendMessage (template ref)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const templateAgent = (context?: Record<string, string>) => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: false,
      pollIntervalMs: 20,
    });
    return new AgentsAPI(http, new FilesAPI(http)).create('inference/my-agent', { context });
  };

  function mockRunAndPoll() {
    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [] });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle, chat_messages: [] });
  }

  it('should POST agent ref and context to /agents/run', async () => {
    mockRunAndPoll();

    await templateAgent({ tenant: 'acme' }).sendMessage('hello', { stream: false });

    const runCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/agents/run')
    ) as [string, RequestInit];
    const body = JSON.parse(String(runCall[1].body));

    expect(body.agent).toBe('inference/my-agent');
    expect(body.agent_config).toBeUndefined();
    expect(body.context).toEqual({ tenant: 'acme' });
    expect(body.chat_id).toBeNull();
    expect(body.input.text).toBe('hello');
  });

  it('should include chat_id on follow-up messages', async () => {
    const agentInstance = templateAgent();

    mockRunAndPoll();
    await agentInstance.sendMessage('first', { stream: false });
    jest.clearAllMocks();

    mockRunAndPoll();
    await agentInstance.sendMessage('second', { stream: false });

    const runCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/agents/run')
    ) as [string, RequestInit];
    const body = JSON.parse(String(runCall[1].body));

    expect(body.agent).toBe('inference/my-agent');
    expect(body.chat_id).toBe('chat-1');
    expect(body.input.text).toBe('second');
  });
});

describe('Agent.sendMessage (ad-hoc config)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const adHocAgent = () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: false,
      pollIntervalMs: 20,
    });
    return new AgentsAPI(http, new FilesAPI(http)).create({
      core_app: { ref: 'openrouter/claude@latest' },
      system_prompt: 'You are helpful',
      name: 'adhoc-bot',
    });
  };

  it('should POST agent_config and agent_name instead of agent template ref', async () => {
    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [] });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle, chat_messages: [] });

    await adHocAgent().sendMessage('hello', { stream: false });

    const runCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/agents/run')
    ) as [string, RequestInit];
    const body = JSON.parse(String(runCall[1].body));

    expect(body.agent).toBeUndefined();
    expect(body.agent_config).toEqual({
      core_app: { ref: 'openrouter/claude@latest' },
      system_prompt: 'You are helpful',
      name: 'adhoc-bot',
    });
    expect(body.agent_name).toBe('adhoc-bot');
    expect(body.input.text).toBe('hello');
  });

  it('should prefer AgentOptions.name over config.name for agent_name', async () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: false,
      pollIntervalMs: 20,
    });
    const namedAgent = new AgentsAPI(http, new FilesAPI(http)).create(
      {
        core_app: { ref: 'openrouter/claude@latest' },
        system_prompt: 'You are helpful',
        name: 'config-name',
      },
      { name: 'override-name' }
    );

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [] });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle, chat_messages: [] });

    await namedAgent.sendMessage('hello', { stream: false });

    const runCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/agents/run')
    ) as [string, RequestInit];
    const body = JSON.parse(String(runCall[1].body));

    expect(body.agent_name).toBe('override-name');
    expect((body.agent_config as { name: string }).name).toBe('config-name');
  });
});

describe('Agent lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const agent = () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: false,
      pollIntervalMs: 20,
    });
    return new AgentsAPI(http, new FilesAPI(http)).create('my-agent');
  };

  it('stopChat should no-op when there is no active chat', async () => {
    await agent().stopChat();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('stopChat should POST to /chats/{id}/stop when a chat exists', async () => {
    const agentInstance = agent();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle, chat_messages: [],
    });

    await agentInstance.sendMessage('hello', { stream: false });
    jest.clearAllMocks();

    mockJsonResponse(null);
    await agentInstance.stopChat();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chats/chat-1/stop'),
      expect.anything()
    );
  });

  it('disconnect should stop active poll managers', async () => {
    jest.useFakeTimers();
    const stopSpy = jest.spyOn(PollManager.prototype, 'stop');
    const agentInstance = agent();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [] });

    const sendPromise = agentInstance.sendMessage('hello', {
      stream: false,
      pollIntervalMs: 5000,
    });
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(0);

    agentInstance.disconnect();

    expect(stopSpy).toHaveBeenCalled();
    stopSpy.mockRestore();
    jest.useRealTimers();
    sendPromise.catch(() => undefined);
  });

  it('disconnect should stop active stream managers', async () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: true,
      pollIntervalMs: 20,
    });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create('my-agent');
    const stopSpy = jest.spyOn(StreamableManager.prototype, 'stop');

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/agents/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: makeMessage({ id: 'user-1', role: 'user' }),
                assistant_message: makeMessage(),
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
        ])
      );
    });

    await agentInstance.sendMessage('hello', { onChat: jest.fn() });
    agentInstance.disconnect();

    expect(stopSpy).toHaveBeenCalled();
    stopSpy.mockRestore();
  });

  it('startStreaming should no-op when there is no active chat', () => {
    const agentInstance = agent();
    agentInstance.startStreaming();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('startStreaming should open the chat stream when chatId exists', async () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: true,
      pollIntervalMs: 20,
    });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create('my-agent');

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle, chat_messages: [],
    });

    await agentInstance.sendMessage('hello', { stream: false });
    jest.clearAllMocks();

    mockFetch.mockResolvedValue(
      mockNdjsonStream([
        `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusIdle } })}\n`,
      ])
    );

    agentInstance.startStreaming({ onChat: jest.fn() });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chats/chat-1/stream'),
      expect.anything()
    );
  });

  it('reset should clear chat state so stopChat is a no-op', async () => {
    const agentInstance = agent();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [],
    });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1', status: ChatStatusIdle, chat_messages: [],
    });

    await agentInstance.sendMessage('hello', { stream: false });
    agentInstance.reset();
    jest.clearAllMocks();

    await agentInstance.stopChat();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sendMessage should clear dedup at turn boundary so onToolCall fires again without reset', async () => {
    const toolInvocation = {
      id: 'tool-inv-turn',
      type: ToolTypeClient,
      status: ToolInvocationStatusAwaitingInput,
      function: { name: 'my_tool', arguments: { x: 1 } },
    };
    const messageWithTool = makeMessage({ tool_invocations: [toolInvocation] });

    const agentInstance = agent();
    const onMessage = jest.fn();
    const onToolCall = jest.fn();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [messageWithTool],
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [messageWithTool],
    });

    await agentInstance.sendMessage('run tool', { stream: false, onMessage, onToolCall });
    expect(onToolCall).toHaveBeenCalledTimes(1);

    onToolCall.mockClear();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-2', role: 'user' }),
      assistant_message: makeMessage({ id: 'asst-2' }),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [messageWithTool],
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [messageWithTool],
    });

    await agentInstance.sendMessage('run tool again', { stream: false, onMessage, onToolCall });
    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onToolCall).toHaveBeenCalledWith({
      id: 'tool-inv-turn',
      name: 'my_tool',
      args: { x: 1 },
    });
  });

  it('reset should allow onToolCall to fire again for the same invocation id', async () => {
    const toolInvocation = {
      id: 'tool-inv-reset',
      type: ToolTypeClient,
      status: ToolInvocationStatusAwaitingInput,
      function: { name: 'my_tool', arguments: { x: 1 } },
    };
    const messageWithTool = makeMessage({ tool_invocations: [toolInvocation] });

    const agentInstance = agent();
    const onMessage = jest.fn();
    const onToolCall = jest.fn();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [messageWithTool],
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [messageWithTool],
    });

    await agentInstance.sendMessage('run tool', { stream: false, onMessage, onToolCall });
    expect(onToolCall).toHaveBeenCalledTimes(1);

    agentInstance.reset();
    jest.clearAllMocks();
    onToolCall.mockClear();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-2', role: 'user' }),
      assistant_message: makeMessage({ id: 'asst-2' }),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: workingRun,
      chat_messages: [messageWithTool],
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({
      id: 'chat-1',
      status: ChatStatusIdle,
      chat_messages: [messageWithTool],
    });

    await agentInstance.sendMessage('run tool again', { stream: false, onMessage, onToolCall });
    expect(onToolCall).toHaveBeenCalledTimes(1);
    expect(onToolCall).toHaveBeenCalledWith({
      id: 'tool-inv-reset',
      name: 'my_tool',
      args: { x: 1 },
    });
  });
});

describe('Agent.getChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const agent = () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    return new AgentsAPI(http, new FilesAPI(http)).create('my-agent');
  };

  it('should return null without a chat id and no active chat', async () => {
    const result = await agent().getChat();
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should GET /chats/{id} when chatId is provided', async () => {
    const chat = { id: 'chat-42', status: 'idle', chat_messages: [] };
    mockJsonResponse(chat);

    const result = await agent().getChat('chat-42');

    expect(result).toEqual(chat);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-42');
    expect(init.method).toBe('GET');
  });

  it('should preserve work_dir and harness_session_id on getChat() responses', async () => {
    const chat = {
      id: 'chat-42',
      status: 'idle',
      chat_messages: [],
      harness_session_id: 'claude-session-9',
      work_dir: '/home/user/project',
    };
    mockJsonResponse(chat);

    const result = await agent().getChat('chat-42');

    expect(result?.harness_session_id).toBe('claude-session-9');
    expect(result?.work_dir).toBe('/home/user/project');
  });

  it('should preserve channel_context when getChat loads a channel-originated chat', async () => {
    const chat = {
      id: 'chat-42',
      status: 'idle',
      chat_messages: [],
      channel_context: {
        channel_type: 'telegram',
        channel_metadata: { chat_id: 42, message_id: 99 },
      },
    };
    mockJsonResponse(chat);

    const result = await agent().getChat('chat-42');

    expect(result?.channel_context?.channel_type).toBe('telegram');
    expect(result?.channel_context?.channel_metadata).toEqual({ chat_id: 42, message_id: 99 });
  });

  it('should expose currentChatId after sendMessage establishes a chat', async () => {
    const agentInstance = agent();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [] });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle, chat_messages: [] });

    expect(agentInstance.currentChatId).toBeNull();

    await agentInstance.sendMessage('hello', { stream: false });

    expect(agentInstance.currentChatId).toBe('chat-1');
  });

  it('should GET /chats/{id} with established chat id when chatId is omitted', async () => {
    const agentInstance = agent();

    mockJsonResponse({
      user_message: makeMessage({ id: 'user-1', role: 'user' }),
      assistant_message: makeMessage(),
    });
    mockJsonResponse({ status: ChatStatusBusy });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusBusy, active_run: workingRun, chat_messages: [] });
    mockJsonResponse({ status: ChatStatusIdle });
    mockJsonResponse({ id: 'chat-1', status: ChatStatusIdle, chat_messages: [] });

    await agentInstance.sendMessage('hello', { stream: false });
    jest.clearAllMocks();

    const chat = { id: 'chat-1', status: 'idle', chat_messages: [] };
    mockJsonResponse(chat);

    const result = await agentInstance.getChat();

    expect(result).toEqual(chat);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1');
    expect(init.method).toBe('GET');
  });
});

describe('Agent.submitToolResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should POST plain string results to /tools/{invocationId}', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create('my-agent');

    mockJsonResponse(null);

    await agentInstance.submitToolResult('inv-plain', 'done');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/tools/inv-plain');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ result: 'done' });
  });

  it('should JSON-stringify structured action results', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create('my-agent');

    mockJsonResponse(null);

    const payload = {
      action: { type: 'form_submit', payload: { field: 'value' } },
      form_data: { field: 'value' },
    };
    await agentInstance.submitToolResult('inv-99', payload);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.result).toBe(JSON.stringify(payload));
  });
});

describe('AgentsAPI.submitToolResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    return new AgentsAPI(http, new FilesAPI(http));
  };

  it('should POST plain string results to /tools/{invocationId}', async () => {
    mockJsonResponse(null);

    await api().submitToolResult('inv-plain', 'done');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/tools/inv-plain');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ result: 'done' });
  });
});

describe('AgentsAPI (template CRUD)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    return new AgentsAPI(http, new FilesAPI(http));
  };

  it('should GET /agents/internal-tools for getInternalTools()', async () => {
    const tools = [{ name: 'search', description: 'Search the web' }];
    mockJsonResponse(tools);

    const result = await api().getInternalTools();

    expect(result.data).toEqual(tools);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/internal-tools');
    expect(init.method).toBe('GET');
  });

  it('should GET /agents/{id}/card for getA2ACard()', async () => {
    const card = {
      name: 'support-bot',
      description: 'Customer support agent',
      url: 'https://api.example.com/agents/support-bot',
      version: '1.0.0',
    };
    mockJsonResponse(card);

    const result = await api().getA2ACard('agent-1');

    expect(result.data).toEqual(card);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/agent-1/card');
    expect(init.method).toBe('GET');
  });

  it('should POST team_id for transferOwnership()', async () => {
    const agent = { id: 'agent-1' };
    mockJsonResponse(agent);

    await api().transferOwnership('agent-1', 'team-42');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/agent-1/transfer');
    expect(JSON.parse(init.body as string)).toEqual({ team_id: 'team-42' });
  });

  it('should POST /agents for createAgent()', async () => {
    const payload = { name: 'support-bot', core_app: { ref: 'app/ref' } };
    const created = { id: 'agent-new', ...payload };
    mockJsonResponse(created);

    const result = await api().createAgent(payload as never);

    expect(result.data).toEqual(created);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should pass harness binding fields through createAgent()', async () => {
    const payload = {
      name: 'claude-bot',
      harness: 'claude',
      profile_id: 'default',
      remote_id: 'dev-mac',
      core_app: { ref: 'app/ref' },
    };
    const created = { id: 'agent-new', ...payload };
    mockJsonResponse(created);

    const result = await api().createAgent(payload as never);

    expect(result.data.harness).toBe('claude');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /agents/{namespace}/{name} for getByName()', async () => {
    const agent = { id: 'agent-1', name: 'my-agent' };
    mockJsonResponse(agent);

    const result = await api().getByName('inference', 'my-agent');

    expect(result.data).toEqual(agent);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/inference/my-agent');
    expect(init.method).toBe('GET');
  });

  it('should preserve harness on getByName() responses', async () => {
    const agent = {
      id: 'agent-1',
      name: 'claude-bot',
      harness: 'claude',
      profile_id: 'default',
      remote_id: 'dev-machine',
    };
    mockJsonResponse(agent);

    const result = await api().getByName('inference', 'claude-bot');

    expect(result.data.harness).toBe('claude');
    expect(result.data.profile_id).toBe('default');
    expect(result.data.remote_id).toBe('dev-machine');
  });

  it('should POST /agents/list for list()', async () => {
    const page = { items: [{ id: 'agent-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list({ limit: 10 });

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /agents/{id} for get()', async () => {
    const agent = { id: 'agent-1', name: 'support-bot' };
    mockJsonResponse(agent);

    const result = await api().get('agent-1');

    expect(result.data).toEqual(agent);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/agent-1');
    expect(init.method).toBe('GET');
  });

  it('should preserve harness on get() responses', async () => {
    const agent = { id: 'agent-1', name: 'support-bot', harness: 'inference' };
    mockJsonResponse(agent);

    const result = await api().get('agent-1');

    expect(result.data.harness).toBe('inference');
  });

  it('should preserve profile_id and remote_id on agent get() responses', async () => {
    const agent = {
      id: 'agent-1',
      name: 'remote-coder',
      profile_id: 'prof-default',
      remote_id: 'remote-dev-machine',
    };
    mockJsonResponse(agent);

    const result = await api().get('agent-1');

    expect(result.data.profile_id).toBe('prof-default');
    expect(result.data.remote_id).toBe('remote-dev-machine');
  });

  it('should POST /agents/{id} for update()', async () => {
    const agent = { id: 'agent-1', name: 'updated' };
    mockJsonResponse(agent);

    const result = await api().update('agent-1', { name: 'updated' } as never);

    expect(result.data).toEqual(agent);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'updated' });
  });

  it('should pass harness through update()', async () => {
    const payload = { harness: 'codex', profile_id: 'team-profile' };
    const agent = { id: 'agent-1', name: 'coder', ...payload };
    mockJsonResponse(agent);

    const result = await api().update('agent-1', payload as never);

    expect(result.data.harness).toBe('codex');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should DELETE /agents/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('agent-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/agent-1');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /agents/{id}/duplicate for duplicate()', async () => {
    const agent = { id: 'agent-copy' };
    mockJsonResponse(agent);

    const result = await api().duplicate('agent-1');

    expect(result.data).toEqual(agent);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/agent-1/duplicate');
    expect(init.method).toBe('POST');
  });

  it('should POST /agents/{id}/versions/list for listVersions()', async () => {
    const page = { items: [{ id: 'ver-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().listVersions('agent-1', { limit: 5 });

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/agent-1/versions/list');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 5 });
  });

  it('should GET /agents/{id}/versions/{versionId} for getVersion()', async () => {
    const version = { id: 'ver-1', agent_id: 'agent-1' };
    mockJsonResponse(version);

    const result = await api().getVersion('agent-1', 'ver-1');

    expect(result.data).toEqual(version);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agents/agent-1/versions/ver-1');
    expect(init.method).toBe('GET');
  });

  it('should POST visibility for updateVisibility()', async () => {
    const agent = { id: 'agent-1', visibility: 'team' };
    mockJsonResponse(agent);

    await api().updateVisibility('agent-1', 'team');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'team' });
  });
});

describe('AgentsAPI.resolveInterrupt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    return new AgentsAPI(http, new FilesAPI(http));
  };

  it('should POST /interrupts/{id}/resolve and preserve resource_type on response', async () => {
    const interrupt = {
      id: 'int-tool',
      status: 'resolved',
      resolution: 'allow',
      resource_type: 'tool_invocation',
      resource_id: 'call-abc',
    };
    mockJsonResponse(interrupt);

    const result = await api().resolveInterrupt('int-tool', 'allow');

    expect(result.data).toEqual(interrupt);
    expect(result.data.resource_type).toBe('tool_invocation');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/interrupts/int-tool/resolve');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ decision: 'allow' });
  });

  it('should POST deny decision for hook_event interrupts', async () => {
    const interrupt = {
      id: 'int-hook',
      status: 'resolved',
      resolution: 'deny',
      resource_type: 'hook_event',
    };
    mockJsonResponse(interrupt);

    const result = await api().resolveInterrupt('int-hook', 'deny');

    expect(result.data.resource_type).toBe('hook_event');
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ decision: 'deny' });
  });
});

describe('AgentsAPI.listRunInterrupts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    return new AgentsAPI(http, new FilesAPI(http));
  };

  it('should GET /agent-runs/{runId}/interrupts with resource_type discriminators', async () => {
    const interrupts = [
      { id: 'int-1', status: 'pending', resource_type: 'tool_invocation' },
      { id: 'int-2', status: 'pending', resource_type: 'hook_event' },
    ];
    mockJsonResponse(interrupts);

    const result = await api().listRunInterrupts('run-42');

    expect(result.data).toEqual(interrupts);
    expect(result.data[0].resource_type).toBe('tool_invocation');
    expect(result.data[1].resource_type).toBe('hook_event');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/agent-runs/run-42/interrupts');
    expect(init.method).toBe('GET');
  });
});
