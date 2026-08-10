import { HttpClient } from '../http/client';
import { FilesAPI } from '../api/files';
import type { AgentClient } from './types';
import {
  sendMessage,
  submitToolResult,
  approveTool,
  rejectTool,
  alwaysAllowTool,
  fetchChat,
  stopChat,
  cancelMessage,
  setAgent,
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

    it('should create chat with empty agent for ad-hoc config', async () => {
      mockJsonResponse(chatResponse);
      mockJsonResponse(userMessageResponse);

      await sendMessage(
        makeClient(),
        { core_app: { ref: 'openrouter/claude@abc' }, system_prompt: 'Be helpful' },
        null,
        'hello'
      );

      const [, init1] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init1.body));
      expect(body.agent).toBe('');
    });

    it('should return only userMessage (assistant arrives via SSE)', async () => {
      mockJsonResponse(chatResponse);
      mockJsonResponse(userMessageResponse);

      const result = await sendMessage(makeClient(), { agent: 'ns/agent' }, null, 'hello');

      expect(result).toEqual({
        chatId: 'chat-1',
        userMessage: userMessageResponse,
      });
      expect(result).not.toHaveProperty('assistantMessage');
    });

    it('should upload raw File attachments before sending', async () => {
      const client = makeClient();
      const fileRecord = {
        id: 'file-1',
        uri: 'inf://files/uploaded',
        filename: 'notes.txt',
        content_type: 'text/plain',
      };
      const uploadSpy = jest.spyOn(client.files, 'upload').mockResolvedValue(fileRecord);
      mockJsonResponse(chatResponse);
      mockJsonResponse(userMessageResponse);

      const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      await sendMessage(client, { agent: 'ns/agent' }, null, 'see attachment', [file]);

      expect(uploadSpy).toHaveBeenCalledWith(file);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      uploadSpy.mockRestore();
    });

    it('should continue sending when a file upload fails', async () => {
      const client = makeClient();
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(client.files, 'upload').mockRejectedValueOnce(new Error('upload failed'));
      mockJsonResponse(chatResponse);
      mockJsonResponse(userMessageResponse);

      const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
      const result = await sendMessage(client, { agent: 'ns/agent' }, null, 'hello', [file]);

      expect(result).not.toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      consoleError.mockRestore();
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

  describe('cancelMessage', () => {
    it('should POST to /chats/messages/{id}/cancel', async () => {
      mockJsonResponse(null);

      await cancelMessage(makeClient(), 'msg-queued');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/chats/messages/msg-queued/cancel');
      expect(init.method).toBe('POST');
    });
  });

  describe('setAgent', () => {
    it('should POST agent ref to /chats/{id}/agent', async () => {
      const updatedChat = { id: 'chat-1', status: 'idle', agent_id: 'agent-2' };
      mockJsonResponse(updatedChat);

      const result = await setAgent(makeClient(), 'chat-1', 'infsh/support-agent');

      expect(result).toEqual(updatedChat);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/chats/chat-1/agent');
      expect(init.method).toBe('POST');
      expect(JSON.parse(String(init.body))).toEqual({ agent: 'infsh/support-agent' });
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
