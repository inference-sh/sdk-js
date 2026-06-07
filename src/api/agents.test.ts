import { HttpClient } from '../http/client';
import {
  ChatStatusBusy,
  ChatStatusIdle,
  FileDTO,
  ToolInvocationStatusAwaitingInput,
  ToolTypeClient,
} from '../types';
import { FilesAPI } from './files';
import { AgentsAPI } from './agents';

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
      success: true,
      data: { user_message: userMessage, assistant_message: assistantMessage },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusBusy } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusBusy, chat_messages: [] },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusIdle } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusIdle, chat_messages: [] },
    });

    const onChat = jest.fn();
    const result = await agent().sendMessage('hello', { stream: false, onChat });

    expect(result.userMessage).toEqual(userMessage);
    expect(result.assistantMessage).toEqual(assistantMessage);
    expect(onChat).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'chat-1', status: ChatStatusIdle })
    );
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
      success: true,
      data: {
        user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
      },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusBusy } });
    mockJsonResponse({
      success: true,
      data: {
        id: 'chat-1',
        status: ChatStatusBusy,
        chat_messages: [messageWithTool],
      },
    });
    // Same status again — stub poll should not re-dispatch tool
    mockJsonResponse({ success: true, data: { status: ChatStatusBusy } });
    mockJsonResponse({ success: true, data: { status: ChatStatusIdle } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusIdle, chat_messages: [messageWithTool] },
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

  it('should return chat output from run() after polling completes', async () => {
    const userMessage = makeMessage({ id: 'user-1', role: 'user' });
    const assistantMessage = makeMessage();

    mockJsonResponse({
      success: true,
      data: { user_message: userMessage, assistant_message: assistantMessage },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusBusy } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusBusy },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusIdle } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusIdle },
    });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusIdle, output: { answer: 42 } },
    });

    const output = await agent().run('compute');

    expect(output).toEqual({ answer: 42 });
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
                success: true,
                data: { user_message: userMessage, assistant_message: assistantMessage },
              })
            ),
        });
      }
      return Promise.resolve(
        mockNdjsonStream([
          `${JSON.stringify({ event: 'chats', data: { id: 'chat-1', status: ChatStatusBusy } })}\n`,
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
                success: true,
                data: {
                  user_message: makeMessage({ id: 'user-1', role: 'user' }),
                  assistant_message: makeMessage(),
                },
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

  it('should open the stream before POST when continuing an existing chat', async () => {
    const http = new HttpClient({
      apiKey: 'test-key',
      stream: true,
      pollIntervalMs: 20,
    });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create('my-agent');

    mockJsonResponse({
      success: true,
      data: {
        user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
      },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusBusy } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusBusy, chat_messages: [] },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusIdle } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusIdle, chat_messages: [] },
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
                success: true,
                data: {
                  user_message: makeMessage({ id: 'user-2', role: 'user' }),
                  assistant_message: makeMessage({ id: 'asst-2' }),
                },
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
      success: true,
      data: {
        user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
      },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusBusy } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusBusy, chat_messages: [] },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusIdle } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusIdle, chat_messages: [] },
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
      success: true,
      data: {
        user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
      },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusBusy } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusBusy, chat_messages: [] },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusIdle } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusIdle, chat_messages: [] },
    });

    await agentInstance.sendMessage('hello', { stream: false });
    jest.clearAllMocks();

    mockJsonResponse({ success: true, data: null });
    await agentInstance.stopChat();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/chats/chat-1/stop'),
      expect.anything()
    );
  });

  it('reset should clear chat state so stopChat is a no-op', async () => {
    const agentInstance = agent();

    mockJsonResponse({
      success: true,
      data: {
        user_message: makeMessage({ id: 'user-1', role: 'user' }),
        assistant_message: makeMessage(),
      },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusBusy } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusBusy, chat_messages: [] },
    });
    mockJsonResponse({ success: true, data: { status: ChatStatusIdle } });
    mockJsonResponse({
      success: true,
      data: { id: 'chat-1', status: ChatStatusIdle, chat_messages: [] },
    });

    await agentInstance.sendMessage('hello', { stream: false });
    agentInstance.reset();
    jest.clearAllMocks();

    await agentInstance.stopChat();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('Agent.submitToolResult', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should JSON-stringify structured action results', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const agentInstance = new AgentsAPI(http, new FilesAPI(http)).create('my-agent');

    mockJsonResponse({ success: true, data: null });

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
