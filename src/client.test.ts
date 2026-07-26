import {
  DeviceAuthStatusApproved,
  DeviceTokenKindSession,
  EntitlementSourceAddon,
  GraphEdgeTypeInput,
  GraphEdgeTypeOutput,
  GraphEdgeTypeSupersedes,
  Inference,
  inference,
  InferenceConfig,
  NotificationTypeDataExport,
  PlanTypeAddon,
  PlanTypeBase,
  RefRouteModeRedirect,
  RefRouteModeRewrite,
  ResourceFeatureSeedance,
  createClient,
} from './index';
import { RequirementsNotMetException } from './http/errors';
import { HttpClient } from './http/client';
import { ChatStatusBusy, ChatStatusIdle } from './types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('package type exports', () => {
  it('exports GraphEdgeTypeSupersedes for version lineage graph edges', () => {
    expect(GraphEdgeTypeSupersedes).toBe('supersedes');
  });

  it('exports NotificationTypeDataExport for data export notifications', () => {
    expect(NotificationTypeDataExport).toBe('data_export');
  });

  it('exports PlanType constants for base and add-on plans', () => {
    expect(PlanTypeBase).toBe('base');
    expect(PlanTypeAddon).toBe('addon');
  });

  it('exports EntitlementSourceAddon for add-on-sourced entitlements', () => {
    expect(EntitlementSourceAddon).toBe('addon');
  });

  it('exports ResourceFeatureSeedance for seedance video feature gating', () => {
    expect(ResourceFeatureSeedance).toBe('feature:seedance');
  });

  it('exports RefRouteMode constants for rewrite and redirect routing', () => {
    expect(RefRouteModeRewrite).toBe('rewrite');
    expect(RefRouteModeRedirect).toBe('redirect');
  });

  it('exports GraphEdgeTypeInput and GraphEdgeTypeOutput for flow I/O graph edges', () => {
    expect(GraphEdgeTypeInput).toBe('input');
    expect(GraphEdgeTypeOutput).toBe('output');
  });

  it('exports DeviceAuthStatusApproved and DeviceTokenKindSession for PKCE device auth', () => {
    expect(DeviceAuthStatusApproved).toBe('approved');
    expect(DeviceTokenKindSession).toBe('session');
  });
});

describe('Inference', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create an instance with valid config', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client).toBeInstanceOf(Inference);
    });

    it('should throw error when neither apiKey nor proxyUrl is provided', () => {
      expect(() => new Inference({ apiKey: '' })).toThrow('Either apiKey, getToken, or proxyUrl is required');
      expect(() => new Inference({} as InferenceConfig)).toThrow('Either apiKey, getToken, or proxyUrl is required');
    });

    it('should use default baseUrl when not provided', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client).toBeDefined();
    });

    it('should accept custom baseUrl', () => {
      const client = new Inference({
        apiKey: 'test-api-key',
        baseUrl: 'https://custom-api.example.com',
      });
      expect(client).toBeDefined();
    });
  });

  describe('run', () => {
    it('should make a POST request to /run', async () => {
      const mockTask = {
        id: 'task-123',
        status: 9, // TaskStatusCompleted
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        input: { message: 'hello world' },
        output: { result: 'success' },
      };

      const responseData = mockTask;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      // Use input that won't trigger base64 detection (contains spaces/special chars)
      const result = await client.run(
        { app: 'test-app', input: { message: 'hello world!' } },
        { wait: false }
      );

      expect(result.id).toBe('task-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/run'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should throw error on API failure', async () => {
      const responseData = { message: 'Invalid app' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      await expect(
        client.run({ app: 'invalid-app', input: { message: 'test!' } }, { wait: false })
      ).rejects.toThrow('Invalid app');
    });

    it('should throw RequirementsNotMetException on 412 with errors', async () => {
      const requirementErrors = [
        {
          type: 'secret',
          key: 'OPENAI_API_KEY',
          message: 'Missing secret: OPENAI_API_KEY',
          action: { type: 'add_secret', secret_key: 'OPENAI_API_KEY' },
        },
        {
          type: 'integration',
          key: 'google',
          message: 'Integration not connected: google',
          action: { type: 'connect', provider: 'google' },
        },
      ];
      const responseData = { errors: requirementErrors };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 412,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      try {
        await client.run({ app: 'test-app', input: { message: 'test!' } }, { wait: false });
        fail('Expected RequirementsNotMetException to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(RequirementsNotMetException);
        const exception = e as RequirementsNotMetException;
        expect(exception.errors).toHaveLength(2);
        expect(exception.errors[0].type).toBe('secret');
        expect(exception.errors[0].key).toBe('OPENAI_API_KEY');
        expect(exception.errors[1].type).toBe('integration');
        expect(exception.statusCode).toBe(412);
        expect(exception.message).toBe('Missing secret: OPENAI_API_KEY');
      }
    });

    it('should include action details in RequirementsNotMetException', async () => {
      const requirementErrors = [
        {
          type: 'scope',
          key: 'calendar.readonly',
          message: 'Missing scope: calendar.readonly',
          action: {
            type: 'add_scopes',
            provider: 'google',
            scopes: ['calendar.readonly', 'calendar.events'],
          },
        },
      ];
      const responseData = { errors: requirementErrors };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 412,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      try {
        await client.run({ app: 'test-app', input: {} }, { wait: false });
        fail('Expected RequirementsNotMetException to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(RequirementsNotMetException);
        const exception = e as RequirementsNotMetException;
        expect(exception.errors[0].action?.type).toBe('add_scopes');
        expect(exception.errors[0].action?.scopes).toEqual(['calendar.readonly', 'calendar.events']);
      }
    });

    it('should process Blob inputs via processInput before calling /apps/run', async () => {
      const fileRecord = {
        id: 'file-blob',
        uri: 'inf://files/blob',
        upload_url: 'https://upload.example.com/put',
        content_type: 'image/png',
      };
      const mockTask = {
        id: 'task-456',
        status: 9,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        input: {},
        output: { result: 'done' },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify([fileRecord])),
          json: () => Promise.resolve([fileRecord]),
        })
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(mockTask)),
          json: () => Promise.resolve(mockTask),
        });

      const client = new Inference({ apiKey: 'test-api-key' });
      const blob = new Blob(['png-bytes'], { type: 'image/png' });
      const result = await client.run(
        { app: 'test-app', input: { image: blob } },
        { wait: false }
      );

      expect(result.id).toBe('task-456');
      expect(mockFetch).toHaveBeenCalledTimes(3);
      const runCall = mockFetch.mock.calls.find((call) =>
        String(call[0]).includes('/apps/run')
      );
      expect(runCall).toBeDefined();
      const runBody = JSON.parse(runCall![1].body as string);
      expect(runBody.input.image).toBe('inf://files/blob');
    });
  });

  describe('cancel', () => {
    it('should make a POST request to cancel endpoint', async () => {
      const responseData = null;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      await client.cancel('task-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/task-123/cancel'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('legacy task helpers', () => {
    it('should delegate getTask() to tasks.get', async () => {
      const mockTask = { id: 'task-legacy', status: 9 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(mockTask)),
        json: () => Promise.resolve(mockTask),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      const result = await client.getTask('task-legacy');

      expect(result.id).toBe('task-legacy');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/task-legacy'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should delegate streamTask() to tasks.stream', async () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      const createEventSource = jest
        .spyOn(HttpClient.prototype, 'createEventSource')
        .mockResolvedValue(null);

      await client.streamTask('task-stream');

      expect(createEventSource).toHaveBeenCalledWith('/tasks/task-stream/stream');
      createEventSource.mockRestore();
    });
  });

  describe('agent()', () => {
    it('should return an Agent whose sendMessage hits POST /agents/run', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({
                user_message: { id: 'user-1', chat_id: 'chat-1', role: 'user', content: 'hi' },
                assistant_message: { id: 'asst-1', chat_id: 'chat-1', role: 'assistant', content: 'hello' },
              })
            ),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ status: ChatStatusBusy })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ id: 'chat-1', status: ChatStatusBusy, chat_messages: [] })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ status: ChatStatusIdle })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ id: 'chat-1', status: ChatStatusIdle, chat_messages: [] })),
        });

      const client = new Inference({ apiKey: 'test-api-key', stream: false, pollIntervalMs: 20 });
      const agentInstance = client.agent('my-agent');
      await agentInstance.sendMessage('hi', { stream: false });

      const runCall = mockFetch.mock.calls.find(([url]) => String(url).includes('/agents/run'));
      expect(runCall).toBeDefined();
      const body = JSON.parse(runCall![1].body as string);
      expect(body.agent).toBe('my-agent');
    });
  });

  describe('createClient', () => {
    it('should create an Inference instance with extended HttpClient config', () => {
      const client = createClient({ apiKey: 'extended-key', baseUrl: 'https://api.example.com' });
      expect(client).toBeInstanceOf(Inference);
    });
  });

  describe('legacy facade methods', () => {
    it('should delegate _request to HttpClient.request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({ legacy: true })),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      const result = await client._request<{ legacy: boolean }>('get', '/legacy/path');

      expect(result).toEqual({ legacy: true });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/legacy/path'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should delegate _createEventSource to HttpClient.createEventSource', async () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      const createEventSource = jest
        .spyOn(client.http, 'createEventSource')
        .mockResolvedValue(null);

      await client._createEventSource('/tasks/task-1/stream');

      expect(createEventSource).toHaveBeenCalledWith('/tasks/task-1/stream');
      createEventSource.mockRestore();
    });
  });

  describe('lowercase factory', () => {
    it('should export lowercase inference factory', () => {
      expect(typeof inference).toBe('function');
    });

    it('should work with lowercase inference factory', () => {
      const client = inference({ apiKey: 'test-api-key' });
      expect(client).toBeInstanceOf(Inference);
    });
  });
});

describe('namespaced APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('client.tasks', () => {
    it('should have tasks namespace', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client.tasks).toBeDefined();
      expect(typeof client.tasks.run).toBe('function');
      expect(typeof client.tasks.get).toBe('function');
      expect(typeof client.tasks.cancel).toBe('function');
      expect(typeof client.tasks.list).toBe('function');
      expect(typeof client.tasks.create).toBe('function');
    });

    it('should create task via tasks.create()', async () => {
      const mockTask = {
        id: 'task-123',
        status: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        input: { message: 'hello world' },
      };

      const responseData = mockTask;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      const result = await client.tasks.create({
        app: 'test-org/test-app@v1',
        input: { message: 'hello world!' },
      });

      expect(result.id).toBe('task-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/apps/run'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should get task via tasks.get()', async () => {
      const mockTask = { id: 'task-123', status: 7 };
      const responseData = mockTask;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      const result = await client.tasks.get('task-123');

      expect(result.id).toBe('task-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/task-123'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should cancel task via tasks.cancel()', async () => {
      const responseData = null;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      });

      const client = new Inference({ apiKey: 'test-api-key' });
      await client.tasks.cancel('task-123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/tasks/task-123/cancel'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('client.files', () => {
    it('should have files namespace', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client.files).toBeDefined();
      expect(typeof client.files.upload).toBe('function');
      expect(typeof client.files.list).toBe('function');
      expect(typeof client.files.get).toBe('function');
      expect(typeof client.files.delete).toBe('function');
    });
  });

  describe('client.agents', () => {
    it('should have agents namespace', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client.agents).toBeDefined();
      expect(typeof client.agents.list).toBe('function');
      expect(typeof client.agents.get).toBe('function');
      expect(typeof client.agents.create).toBe('function');
    });
  });

  describe('client.apps', () => {
    it('should have apps namespace', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client.apps).toBeDefined();
      expect(typeof client.apps.list).toBe('function');
      expect(typeof client.apps.get).toBe('function');
      expect(typeof client.apps.getByName).toBe('function');
    });
  });

  describe('client.chats', () => {
    it('should have chats namespace', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client.chats).toBeDefined();
      expect(typeof client.chats.list).toBe('function');
      expect(typeof client.chats.get).toBe('function');
    });
  });

  describe('client.flows', () => {
    it('should have flows namespace', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client.flows).toBeDefined();
      expect(typeof client.flows.list).toBe('function');
      expect(typeof client.flows.get).toBe('function');
    });
  });

  describe('client.flowRuns', () => {
    it('should have flowRuns namespace', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client.flowRuns).toBeDefined();
      expect(typeof client.flowRuns.list).toBe('function');
      expect(typeof client.flowRuns.get).toBe('function');
    });
  });

  describe('client.engines', () => {
    it('should have engines namespace', () => {
      const client = new Inference({ apiKey: 'test-api-key' });
      expect(client.engines).toBeDefined();
      expect(typeof client.engines.list).toBe('function');
      expect(typeof client.engines.get).toBe('function');
    });
  });
});

describe('uploadFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should upload a base64 string', async () => {
    const mockFile = {
      id: 'file-123',
      uri: 'https://example.com/file.png',
      upload_url: 'https://upload.example.com/signed-url',
    };

    const responseData = [mockFile];
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(responseData)),
        json: () => Promise.resolve(responseData),
      })
      .mockResolvedValueOnce({ ok: true });

    const client = new Inference({ apiKey: 'test-api-key' });
    // Use valid base64 that won't be mistaken for regular text
    const result = await client.uploadFile('SGVsbG8gV29ybGQh', {
      filename: 'test.txt',
      contentType: 'text/plain',
    });

    expect(result.uri).toBe('https://example.com/file.png');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should throw error when no upload URL provided', async () => {
    const mockFile = {
      id: 'file-123',
      uri: 'https://example.com/file.png',
      // Missing upload_url
    };

    const responseData = [mockFile];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify(responseData)),
      json: () => Promise.resolve(responseData),
    });

    const client = new Inference({ apiKey: 'test-api-key' });
    await expect(
      client.uploadFile('SGVsbG8gV29ybGQh', { filename: 'test.txt' })
    ).rejects.toThrow('No upload URL provided by the server');
  });
});
