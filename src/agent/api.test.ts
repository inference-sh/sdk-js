import { HttpClient } from '../http/client';
import { FilesAPI } from '../api/files';
import type { AgentClient } from './types';
import {
  sendAdHocMessage,
  sendTemplateMessage,
  sendMessage,
  submitToolResult,
  approveTool,
  rejectTool,
  alwaysAllowTool,
  fetchChat,
  stopChat,
  getChatStreamConfig,
} from './api';
import { ToolTypeClient } from '../types';

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

const adHocConfig = {
  name: 'test-agent',
  core_app: { ref: 'openrouter/claude@abc' },
  system_prompt: 'Be helpful',
};

const runResponse = {
  user_message: { id: 'u1', chat_id: 'chat-1', role: 'user' },
  assistant_message: { id: 'a1', chat_id: 'chat-1', role: 'assistant' },
};

describe('agent/api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendAdHocMessage', () => {
    it('should return null when the API response omits messages', async () => {
      mockJsonResponse({});

      const result = await sendAdHocMessage(makeClient(), adHocConfig, null, 'hello');

      expect(result).toBeNull();
    });

    it('should strip client tool handlers from the agents/run request body', async () => {
      mockJsonResponse(runResponse);

      const handler = jest.fn().mockReturnValue('ok');
      await sendAdHocMessage(
        makeClient(),
        {
          ...adHocConfig,
          tools: [
            {
              schema: {
                name: 'browser_tool',
                type: ToolTypeClient,
                description: 'runs in browser',
              },
              handler,
            },
          ],
        },
        null,
        'hello'
      );

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init.body));
      expect(body.agent_config.tools[0]).toEqual({
        name: 'browser_tool',
        type: ToolTypeClient,
        description: 'runs in browser',
      });
      expect(body.agent_config.tools[0]).not.toHaveProperty('handler');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('sendTemplateMessage', () => {
    it('should return null when assistant_message is missing', async () => {
      mockJsonResponse({
        user_message: { id: 'u1', chat_id: 'chat-1', role: 'user' },
      });

      const result = await sendTemplateMessage(
        makeClient(),
        { agent: 'agent-1' },
        null,
        'hello'
      );

      expect(result).toBeNull();
    });

    it('should omit empty agent field for existing chats', async () => {
      mockJsonResponse(runResponse);

      await sendTemplateMessage(makeClient(), { agent: '' }, 'chat-existing', 'hi');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init.body));
      expect(body.chat_id).toBe('chat-existing');
      expect(body).not.toHaveProperty('agent');
    });
  });

  describe('sendMessage', () => {
    it('should pass FileRef attachments without uploading', async () => {
      mockJsonResponse(runResponse);

      const fileRef = {
        id: 'f1',
        uri: 'inf://files/abc',
        filename: 'image.png',
        content_type: 'image/png',
      };
      await sendMessage(makeClient(), adHocConfig, null, 'see image', [fileRef]);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init.body));
      expect(body.input.attachments).toEqual([fileRef]);
    });

    it('should omit attachments when every file upload fails', async () => {
      const client = makeClient();
      const uploadSpy = jest
        .spyOn(client.files, 'upload')
        .mockRejectedValue(new Error('upload failed'));
      mockJsonResponse(runResponse);

      const file = new File(['data'], 'doc.txt', { type: 'text/plain' });
      await sendMessage(client, adHocConfig, null, 'with file', [file]);

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(String(init.body));
      expect(body.input.attachments).toBeUndefined();
      uploadSpy.mockRestore();
    });

    it('should upload File inputs before sending', async () => {
      const fileRecord = {
        id: 'file-1',
        uri: 'inf://files/uploaded',
        filename: 'hello.txt',
        upload_url: 'https://upload.example/put',
        content_type: 'text/plain',
      };
      mockJsonResponse([fileRecord]);
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
      mockJsonResponse(runResponse);

      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
      await sendMessage(makeClient(), adHocConfig, null, 'with file', [file]);

      expect(mockFetch).toHaveBeenCalledTimes(3);
      const [, runInit] = mockFetch.mock.calls[2] as [string, RequestInit];
      const body = JSON.parse(String(runInit.body));
      expect(body.input.attachments).toEqual([fileRecord]);
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

      const payload = {
        action: { type: 'approve', payload: { ok: true } },
      };
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

    it('should return null and not throw when the request fails', async () => {
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

    it('should swallow errors without throwing', async () => {
      mockFetch.mockRejectedValueOnce(new Error('stop failed'));

      await expect(stopChat(makeClient(), 'chat-1')).resolves.toBeUndefined();
    });
  });

  describe('HIL tool approval', () => {
    it('approveTool should POST to /tools/{id}/invoke', async () => {
      mockJsonResponse(null);

      await approveTool(makeClient(), 'inv-approve');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/tools/inv-approve/invoke');
      expect(init.method).toBe('POST');
    });

    it('rejectTool should POST reason to /tools/{id}/reject', async () => {
      mockJsonResponse(null);

      await rejectTool(makeClient(), 'inv-reject', 'not safe');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/tools/inv-reject/reject');
      expect(JSON.parse(String(init.body))).toEqual({ reason: 'not safe' });
    });

    it('alwaysAllowTool should POST tool_name to the chat tools endpoint', async () => {
      mockJsonResponse(null);

      await alwaysAllowTool(makeClient(), 'chat-1', 'inv-allow', 'browser_tool');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/chats/chat-1/tools/inv-allow/always-allow');
      expect(JSON.parse(String(init.body))).toEqual({ tool_name: 'browser_tool' });
    });

    it('should rethrow when approveTool request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('approve failed'));

      await expect(approveTool(makeClient(), 'inv-1')).rejects.toThrow('approve failed');
    });
  });

  describe('getChatStreamConfig', () => {
    it('should delegate to HttpClient.getStreamableConfig for the chat stream path', () => {
      const client = makeClient();
      const config = getChatStreamConfig(client, 'chat-xyz');

      expect(config.url).toContain('/chats/chat-xyz/stream');
      expect(config.headers).toEqual(
        expect.objectContaining({ Authorization: expect.stringContaining('Bearer') })
      );
    });
  });
});
