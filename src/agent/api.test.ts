import { HttpClient } from '../http/client';
import { FilesAPI } from '../api/files';
import type { InterruptDTO } from '../types';
import {
  InterruptReasonToolApproval,
  InterruptReasonHookGate,
  InterruptResourceHookEvent,
  InterruptResourceToolInvocation,
  InterruptStatusPending,
  InterruptStatusResolved,
  InterruptResolutionAllow,
  InterruptResolutionDeny,
  VisibilityTeam,
} from '../types';
import type { AgentClient } from './types';
import {
  sendMessage,
  submitToolResult,
  resolveInterrupt,
  listRunInterrupts,
  approveTool,
  rejectTool,
  alwaysAllowTool,
  fetchChat,
  fetchMessages,
  fetchMessagesPage,
  cancelMessage,
  stopChat,
  getChatStreamConfig,
  uploadFile,
} from './api';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function makeInterruptFixture(overrides: Partial<InterruptDTO> = {}): InterruptDTO {
  return {
    id: 'int-1',
    short_id: 'i1',
    created_at: '2026-08-13T00:00:00Z',
    updated_at: '2026-08-13T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: VisibilityTeam,
    run_id: 'run-1',
    chat_id: 'chat-1',
    reason: InterruptReasonToolApproval,
    source: 'tool:search',
    status: InterruptStatusPending,
    ...overrides,
  };
}

function makeClient(): AgentClient {
  const http = new HttpClient({ apiKey: 'test-key' });
  const files = new FilesAPI(http);
  return { http, files };
}

const chatResponse = { id: 'chat-1', status: 'idle' };
const userMessageResponse = { id: 'u1', chat_id: 'chat-1', role: 'user', status: 'ready' };
const queuedMessageResponse = { id: 'u2', chat_id: 'chat-1', role: 'user', status: 'queued' };

describe('agent/api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should create chat then send message when no chatId (template)', async () => {
      mockJsonResponse(chatResponse);        // POST /chats
      mockJsonResponse(userMessageResponse);  // POST /chats/{id}/messages

      const result = await sendMessage(makeClient(), { agent: 'ns/agent' }, null, 'hello');

      expect(result).not.toBeNull();
      expect(result!.chatId).toBe('chat-1');
      expect(result!.userMessage.id).toBe('u1');

      const [url1] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url1).toContain('/chats');
      expect(url1).not.toContain('/messages');

      const [url2, init2] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(url2).toContain('/chats/chat-1/messages');
      expect(JSON.parse(String(init2.body))).toEqual({ message: 'hello' });
    });

    it('should send follow-up via /chats/{id}/messages when chatId exists', async () => {
      mockJsonResponse(queuedMessageResponse);

      const result = await sendMessage(makeClient(), { agent: 'ns/agent' }, 'chat-1', 'follow up');

      expect(result).not.toBeNull();
      expect(result!.chatId).toBe('chat-1');
      expect(result!.userMessage.status).toBe('queued');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/chats/chat-1/messages');
      expect(JSON.parse(String(init.body))).toEqual({ message: 'follow up' });
    });

    it('should pass agent ref when creating chat', async () => {
      mockJsonResponse(chatResponse);
      mockJsonResponse(userMessageResponse);

      await sendMessage(makeClient(), { agent: 'infsh/my-agent' }, null, 'hi');

      const [, init1] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init1.body));
      expect(body.agent).toBe('infsh/my-agent');
    });

    it('should pass FileRef attachments without uploading', async () => {
      mockJsonResponse(chatResponse);
      mockJsonResponse(userMessageResponse);

      const fileRef = {
        id: 'f1',
        uri: 'inf://files/abc',
        filename: 'image.png',
        content_type: 'image/png',
      };
      await sendMessage(makeClient(), { agent: 'ns/agent' }, null, 'see image', [fileRef]);

      // 2 calls: create chat + send message (no upload call)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should forward template context values via createChat', async () => {
      mockJsonResponse(chatResponse);
      mockJsonResponse(userMessageResponse);

      await sendMessage(
        makeClient(),
        { agent: 'infsh/pricing-agent', context: { version_id: 'v1', locale: 'en-US' } },
        null,
        'show pricing'
      );

      const [, init1] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init1.body));
      expect(body.agent).toBe('infsh/pricing-agent');
      expect(body.context).toEqual({ version_id: 'v1', locale: 'en-US' });
    });

    it('should omit context when creating chat for ad-hoc agents', async () => {
      mockJsonResponse(chatResponse);
      mockJsonResponse(userMessageResponse);

      await sendMessage(
        makeClient(),
        {
          core_app: { ref: 'openrouter/claude@abc' },
          system_prompt: 'Be helpful',
          name: 'adhoc-bot',
        },
        null,
        'hello'
      );

      const [, init1] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init1.body));
      expect(body.agent).toBe('');
      expect(body.context).toBeUndefined();
    });
  });

  describe('submitToolResult', () => {
    it('should wrap string results in { result }', async () => {
      mockJsonResponse(null);
      await submitToolResult(makeClient(), 'inv-1', 'done');
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/tools/inv-1');
      expect(JSON.parse(String(init.body))).toEqual({ result: 'done' });
    });

    it('should pass structured action objects through unchanged', async () => {
      mockJsonResponse(null);
      const payload = { action: { type: 'approve', payload: { ok: true } } };
      await submitToolResult(makeClient(), 'inv-2', payload);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual(payload);
    });
  });

  describe('fetchMessagesPage', () => {
    it('should GET /chats/{id}/messages without limit when options omitted', async () => {
      const messages = [{ id: 'm1', chat_id: 'chat-1', role: 'user', content: 'hi' }];
      mockJsonResponse({ items: messages, next_cursor: '', has_next: false });

      const result = await fetchMessagesPage(makeClient(), 'chat-1');

      expect(result.items).toEqual(messages);
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/chats/chat-1/messages');
      expect(url).not.toContain('limit=');
      expect(url).not.toContain('cursor=');
    });

    it('should pass cursor when provided in options', async () => {
      mockJsonResponse({ items: [], next_cursor: 'cursor-abc', has_next: true });

      await fetchMessagesPage(makeClient(), 'chat-1', { cursor: 'cursor-abc' });

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('cursor=cursor-abc');
    });

    it('should return empty page when message fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('messages unavailable'));

      const result = await fetchMessagesPage(makeClient(), 'chat-1');

      expect(result).toEqual({ items: [], next_cursor: '', has_next: false });
    });
  });

  describe('fetchMessages', () => {
    it('should return items from fetchMessagesPage', async () => {
      const messages = [{ id: 'm1', chat_id: 'chat-1', role: 'user', content: 'hi' }];
      mockJsonResponse({ items: messages, next_cursor: 'page-2', has_next: true });

      const result = await fetchMessages(makeClient(), 'chat-1', { limit: 25 });

      expect(result).toEqual(messages);
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('limit=25');
    });
  });

  describe('resolveInterrupt', () => {
    it('should POST allow decision and preserve tool_invocation resource_type', async () => {
      const interrupt = makeInterruptFixture({
        id: 'int-1',
        status: InterruptStatusResolved,
        resolution: InterruptResolutionAllow,
        resource_type: InterruptResourceToolInvocation,
        resource_id: 'call-abc',
      });
      mockJsonResponse(interrupt);

      const result = await resolveInterrupt(makeClient(), 'int-1', 'allow');

      expect(result).toEqual(interrupt);
      expect(result.resource_type).toBe('tool_invocation');
      expect(result.user_id).toBe('user-1');
      expect(result.visibility).toBe('team');
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/interrupts/int-1/resolve');
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({ decision: 'allow' });
    });

    it('should POST deny decision and preserve hook_event resource_type', async () => {
      const interrupt = makeInterruptFixture({
        id: 'int-2',
        reason: InterruptReasonHookGate,
        source: 'agent.tool_call',
        status: InterruptStatusResolved,
        resolution: InterruptResolutionDeny,
        resource_type: InterruptResourceHookEvent,
        resource_id: 'evt-xyz',
      });
      mockJsonResponse(interrupt);

      const result = await resolveInterrupt(makeClient(), 'int-2', 'deny');

      expect(result.resource_type).toBe('hook_event');
      expect(result.team_id).toBe('team-1');
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({ decision: 'deny' });
    });
  });

  describe('listRunInterrupts', () => {
    it('should GET pending interrupts with resource_type discriminators', async () => {
      const interrupts: InterruptDTO[] = [
        makeInterruptFixture({
          id: 'int-1',
          status: InterruptStatusPending,
          resource_type: InterruptResourceToolInvocation,
        }),
        makeInterruptFixture({
          id: 'int-2',
          reason: InterruptReasonHookGate,
          source: 'agent.tool_call',
          status: InterruptStatusPending,
          resource_type: InterruptResourceHookEvent,
        }),
      ];
      mockJsonResponse(interrupts);

      const result = await listRunInterrupts(makeClient(), 'run-xyz');

      expect(result).toEqual(interrupts);
      expect(result[0].resource_type).toBe('tool_invocation');
      expect(result[1].resource_type).toBe('hook_event');
      expect(result[0].user_id).toBe('user-1');
      expect(result[1].visibility).toBe('team');
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/agent-runs/run-xyz/interrupts');
      expect(init.method).toBe('GET');
    });
  });

  describe('fetchChat', () => {
    it('should fetch messages separately when Chat.Get does not preload them', async () => {
      const chat = { id: 'chat-1', status: 'idle' };
      const messages = [{ id: 'm1', chat_id: 'chat-1', role: 'user', content: 'hi' }];
      mockJsonResponse(chat);
      mockJsonResponse({ items: messages, next_cursor: '', has_next: false });

      const result = await fetchChat(makeClient(), 'chat-1');

      expect(result).toEqual({
        ...chat,
        chat_messages: messages,
        _messageCursor: '',
        _hasOlderMessages: false,
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [messagesUrl] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(messagesUrl).toContain('/chats/chat-1/messages');
      expect(messagesUrl).not.toContain('limit=');
    });

    it('should attach pagination metadata when more message pages exist', async () => {
      const chat = { id: 'chat-1', status: 'idle' };
      const messages = [{ id: 'm1', chat_id: 'chat-1', role: 'user', content: 'hi' }];
      mockJsonResponse(chat);
      mockJsonResponse({ items: messages, next_cursor: 'page-2', has_next: true });

      const result = await fetchChat(makeClient(), 'chat-1');

      expect((result as unknown as Record<string, unknown>)._messageCursor).toBe('page-2');
      expect((result as unknown as Record<string, unknown>)._hasOlderMessages).toBe(true);
    });

    it('should skip message fetch when chat_messages are already preloaded', async () => {
      const messages = [{ id: 'm1', chat_id: 'chat-1', role: 'user', content: 'hi' }];
      const chat = { id: 'chat-1', status: 'idle', chat_messages: messages };
      mockJsonResponse(chat);

      const result = await fetchChat(makeClient(), 'chat-1');

      expect(result).toEqual(chat);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return chat with empty messages when message fetch fails', async () => {
      const chat = { id: 'chat-1', status: 'idle' };
      mockJsonResponse(chat);
      mockFetch.mockRejectedValueOnce(new Error('messages unavailable'));

      const result = await fetchChat(makeClient(), 'chat-1');

      expect(result).toEqual({
        ...chat,
        chat_messages: [],
        _messageCursor: '',
        _hasOlderMessages: false,
      });
    });

    it('should return null when chat fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'));
      const result = await fetchChat(makeClient(), 'chat-1');
      expect(result).toBeNull();
    });
  });

  describe('cancelMessage', () => {
    it('should POST to /chats/messages/{id}/cancel', async () => {
      mockJsonResponse({ id: 'msg-queued', status: 'cancelled' });

      await cancelMessage(makeClient(), 'msg-queued');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/chats/messages/msg-queued/cancel');
      expect(init.method).toBe('POST');
    });
  });

  describe('stopChat', () => {
    it('should POST to /chats/{id}/stop', async () => {
      mockJsonResponse(null);
      await stopChat(makeClient(), 'chat-1');
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/chats/chat-1/stop');
      expect(init.method).toBe('POST');
    });
  });

  describe('HIL tool approval', () => {
    it('approveTool should POST to /tools/{id}/invoke', async () => {
      mockJsonResponse(null);
      await approveTool(makeClient(), 'inv-approve');
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/tools/inv-approve/invoke');
    });

    it('rejectTool should POST reason to /tools/{id}/reject', async () => {
      mockJsonResponse(null);
      await rejectTool(makeClient(), 'inv-reject', 'not safe');
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({ reason: 'not safe' });
    });

    it('alwaysAllowTool should POST tool_name', async () => {
      mockJsonResponse(null);
      await alwaysAllowTool(makeClient(), 'chat-1', 'inv-allow', 'browser_tool');
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/chats/chat-1/tools/inv-allow/always-allow');
      expect(JSON.parse(String(init.body))).toEqual({ tool_name: 'browser_tool' });
    });
  });

  describe('getChatStreamConfig', () => {
    it('should return config for the chat stream path', () => {
      const config = getChatStreamConfig(makeClient(), 'chat-xyz');
      expect(config.url).toContain('/chats/chat-xyz/stream');
    });
  });

  describe('uploadFile', () => {
    it('should delegate to client.files.upload', async () => {
      const client = makeClient();
      const fileRecord = { id: 'file-1', uri: 'inf://files/uploaded', filename: 'notes.txt', content_type: 'text/plain' };
      const uploadSpy = jest.spyOn(client.files, 'upload').mockResolvedValue(fileRecord);
      const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });

      const result = await uploadFile(client, file);
      expect(result).toEqual(fileRecord);
      uploadSpy.mockRestore();
    });
  });
});
