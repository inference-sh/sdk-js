import { HttpClient } from '../http/client';
import { FilesAPI } from '../api/files';
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
        { agent: 'infsh/pricing-agent', context: { version_id: 'v1' } },
        null,
        'show pricing'
      );

      // Chat created with agent ref
      const [, init1] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init1.body));
      expect(body.agent).toBe('infsh/pricing-agent');
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

  describe('resolveInterrupt', () => {
    it('should POST allow decision and return interrupt DTO', async () => {
      const interrupt = { id: 'int-1', status: 'resolved', resolution: 'allow' };
      mockJsonResponse(interrupt);

      const result = await resolveInterrupt(makeClient(), 'int-1', 'allow');

      expect(result).toEqual(interrupt);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/interrupts/int-1/resolve');
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({ decision: 'allow' });
    });

    it('should POST deny decision and return interrupt DTO', async () => {
      const interrupt = { id: 'int-2', status: 'resolved', resolution: 'deny' };
      mockJsonResponse(interrupt);

      const result = await resolveInterrupt(makeClient(), 'int-2', 'deny');

      expect(result).toEqual(interrupt);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(String(init.body))).toEqual({ decision: 'deny' });
    });
  });

  describe('listRunInterrupts', () => {
    it('should GET pending interrupts for a run', async () => {
      const interrupts = [{ id: 'int-1', status: 'pending' }];
      mockJsonResponse(interrupts);

      const result = await listRunInterrupts(makeClient(), 'run-xyz');

      expect(result).toEqual(interrupts);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/agent-runs/run-xyz/interrupts');
      expect(init.method).toBe('GET');
    });
  });

  describe('fetchChat', () => {
    it('should return chat data on success', async () => {
      const chat = { id: 'chat-1', status: 'idle' };
      mockJsonResponse(chat);
      const result = await fetchChat(makeClient(), 'chat-1');
      expect(result).toEqual(chat);
    });

    it('should return null on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('network error'));
      const result = await fetchChat(makeClient(), 'chat-1');
      expect(result).toBeNull();
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
