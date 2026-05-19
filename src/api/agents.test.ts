import { HttpClient } from '../http/client';
import {
  ChatStatusBusy,
  ChatStatusIdle,
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
