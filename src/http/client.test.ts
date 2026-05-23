import { HttpClient, createHttpClient } from './client';
import { InferenceError, RequirementsNotMetException } from './errors';
import { EventSource } from 'eventsource';

jest.mock('eventsource');

const mockFetch = jest.fn();
global.fetch = mockFetch;
const MockEventSource = EventSource as unknown as jest.Mock;

function mockJsonResponse(body: unknown, status = 200, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('HttpClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw when no apiKey, getToken, or proxyUrl', () => {
      expect(() => new HttpClient({})).toThrow(
        'Either apiKey, getToken, or proxyUrl is required'
      );
    });

    it('should allow proxyUrl without apiKey', () => {
      const client = new HttpClient({ proxyUrl: 'https://proxy.example.com' });
      expect(client.isProxyMode()).toBe(true);
    });

    it('should expose stream and poll interval config', () => {
      const client = new HttpClient({
        apiKey: 'key',
        stream: false,
        pollIntervalMs: 5000,
      });
      expect(client.getStreamDefault()).toBe(false);
      expect(client.getPollIntervalMs()).toBe(5000);
    });

    it('createHttpClient should return an HttpClient instance', () => {
      const client = createHttpClient({ apiKey: 'key' });
      expect(client).toBeInstanceOf(HttpClient);
    });
  });

  describe('request', () => {
    const client = () => new HttpClient({ apiKey: 'test-key' });

    it('should return parsed data on success', async () => {
      mockJsonResponse({ id: 'task-1' });

      const result = await client().request<{ id: string }>('get', '/tasks/task-1');
      expect(result).toEqual({ id: 'task-1' });
    });

    it('should return null for null response body', async () => {
      mockJsonResponse(null);

      const result = await client().request<null>('post', '/tasks/task-1/cancel');
      expect(result).toBeNull();
    });

    it('should return undefined for 204 No Content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(''),
      });

      const result = await client().request<void>('delete', '/tasks/task-1');
      expect(result).toBeUndefined();
    });

    it('should throw InferenceError on non-ok response', async () => {
      mockJsonResponse({ message: 'Invalid request' }, 400, false);

      const err = await client().request('get', '/tasks/1').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(InferenceError);
      expect((err as InferenceError).message).toContain('Invalid request');
    });

    it('should throw RequirementsNotMetException on HTTP 412', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 412,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              errors: [{ type: 'secret', key: 'API_KEY', message: 'Missing secret' }],
            })
          ),
      });

      await expect(client().request('post', '/apps/run')).rejects.toBeInstanceOf(
        RequirementsNotMetException
      );
    });

    it('should retry when onError handler calls retry', async () => {
      const httpClient = new HttpClient({
        apiKey: 'key',
        onError: async (_error, retry) => retry(),
      });

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('server error'),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify({ ok: true })),
        });

      const result = await httpClient.request<{ ok: boolean }>('get', '/tasks/1');
      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should route through proxy with x-inf-target-url header', async () => {
      const proxyClient = new HttpClient({ proxyUrl: 'https://proxy.example.com' });
      mockJsonResponse({ id: '1' });

      await proxyClient.request('get', '/tasks/1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://proxy.example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-inf-target-url': 'https://api.inference.sh/tasks/1',
          }),
        })
      );
    });

    it('should serialize array query params as JSON', async () => {
      mockJsonResponse([]);

      await client().request('get', '/tasks', {
        params: { ids: ['a', 'b'] },
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('ids=');
      expect(decodeURIComponent(calledUrl)).toContain('["a","b"]');
    });

    it('should use top-level message field in HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve(JSON.stringify({ message: 'service unavailable' })),
      });

      await expect(client().request('get', '/tasks/1')).rejects.toMatchObject({
        name: 'InferenceError',
        message: expect.stringContaining('service unavailable'),
      });
    });

    it('should use getToken for Authorization on regular requests', async () => {
      mockJsonResponse({ id: 'task-1' });

      const tokenClient = new HttpClient({ getToken: () => 'dynamic-key' });
      await tokenClient.request('get', '/tasks/task-1');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer dynamic-key');
    });

    it('should send X-API-Version 2 and X-Client-Source on every request', async () => {
      mockJsonResponse({ id: 'task-1' });

      await client().request('get', '/tasks/task-1');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['X-API-Version']).toBe('2');
      expect(headers['X-Client-Source']).toMatch(/inference-sdk-js\//);
    });

    it('should prefer RFC 9457 detail over title in error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              type: 'about:blank',
              title: 'Validation failed',
              detail: 'app field is required',
            })
          ),
      });

      await expect(client().request('post', '/apps')).rejects.toMatchObject({
        name: 'InferenceError',
        message: expect.stringContaining('app field is required'),
      });
    });

    it('should fall back to RFC 9457 title when detail is absent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () =>
          Promise.resolve(JSON.stringify({ type: 'about:blank', title: 'Forbidden' })),
      });

      await expect(client().request('get', '/tasks/1')).rejects.toMatchObject({
        name: 'InferenceError',
        message: expect.stringContaining('Forbidden'),
      });
    });

    it('should use raw response text when error body is not JSON', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        text: () => Promise.resolve('Bad Gateway from upstream'),
      });

      await expect(client().request('get', '/tasks/1')).rejects.toMatchObject({
        name: 'InferenceError',
        message: expect.stringContaining('Bad Gateway from upstream'),
      });
    });

    it('should not unwrap legacy v1 APIResponse envelopes', async () => {
      const v1Envelope = { success: true, data: { id: 'task-legacy' } };
      mockJsonResponse(v1Envelope);

      const result = await client().request<typeof v1Envelope>('get', '/tasks/legacy');
      expect(result).toEqual(v1Envelope);
    });
  });

  describe('getStreamableConfig', () => {
    it('should include bearer token in direct mode', () => {
      const config = new HttpClient({ apiKey: 'secret-key' }).getStreamableConfig(
        '/tasks/task-1/stream'
      );

      expect(config.url).toBe('https://api.inference.sh/tasks/task-1/stream');
      expect(config.headers.Authorization).toBe('Bearer secret-key');
    });

    it('should route through proxy with target URL header', () => {
      const config = new HttpClient({
        proxyUrl: 'https://proxy.example.com/api',
      }).getStreamableConfig('/tasks/task-1/stream');

      expect(config.url).toContain('https://proxy.example.com/api');
      expect(config.url).toContain('__inf_target=');
      expect(config.headers['x-inf-target-url']).toBe(
        'https://api.inference.sh/tasks/task-1/stream'
      );
    });

    it('should use getToken when apiKey is not set', () => {
      const config = new HttpClient({
        getToken: () => 'dynamic-token',
      }).getStreamableConfig('/tasks/task-1/stream');

      expect(config.headers.Authorization).toBe('Bearer dynamic-token');
    });
  });

  describe('createEventSource', () => {
    beforeEach(() => {
      MockEventSource.mockReset();
    });

    it('should attach Bearer token in direct mode via custom fetch', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const client = new HttpClient({ apiKey: 'sse-key' });
      await client.createEventSource('/tasks/task-1/stream');

      expect(capturedFetch).toBeDefined();
      await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', { headers: {} });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.inference.sh/tasks/task-1/stream',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sse-key',
          }),
        })
      );
    });

    it('should route through proxy with target URL header on custom fetch', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((url, options) => {
        capturedFetch = options?.fetch;
        expect(url).toContain('https://proxy.example.com');
        expect(url).toContain('__inf_target=');
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const client = new HttpClient({ proxyUrl: 'https://proxy.example.com' });
      await client.createEventSource('/tasks/task-1/stream');

      await capturedFetch!('https://proxy.example.com', { headers: {} });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://proxy.example.com',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-inf-target-url': 'https://api.inference.sh/tasks/task-1/stream',
          }),
        })
      );
    });
  });
});
