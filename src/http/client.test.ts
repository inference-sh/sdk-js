import { HttpClient, createHttpClient } from './client';
import { InferenceError, RequirementsNotMetException } from './errors';
import { SDK_VERSION } from '../version';
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

    it('should return the configured baseUrl from getBaseUrl()', () => {
      const client = new HttpClient({
        apiKey: 'key',
        baseUrl: 'https://custom.example.com',
      });
      expect(client.getBaseUrl()).toBe('https://custom.example.com');
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
      expect(result.data).toEqual({ id: 'task-1' });
    });

    it('should return null for null response body', async () => {
      mockJsonResponse(null);

      const result = await client().request<null>('post', '/tasks/task-1/cancel');
      expect(result.data).toBeNull();
    });

    it('should return undefined for 204 No Content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(''),
      });

      const result = await client().request<void>('delete', '/tasks/task-1');
      expect(result.data).toBeUndefined();
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
      expect(result.data).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should propagate when onError handler rethrows', async () => {
      const capturedErrors: unknown[] = [];
      const httpClient = new HttpClient({
        apiKey: 'key',
        onError: async (error) => {
          capturedErrors.push(error);
          throw error;
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ detail: 'session expired' })),
      });

      await expect(httpClient.request('get', '/tasks/1')).rejects.toMatchObject({
        name: 'InferenceError',
        statusCode: 401,
        message: expect.stringContaining('session expired'),
      });
      expect(capturedErrors).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should propagate when onError handler rejects without retrying', async () => {
      const httpClient = new HttpClient({
        apiKey: 'key',
        onError: async () => {
          throw new InferenceError(403, 'otp_required');
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve(JSON.stringify({ detail: 'otp_required' })),
      });

      await expect(httpClient.request('get', '/tasks/1')).rejects.toMatchObject({
        name: 'InferenceError',
        statusCode: 403,
        message: expect.stringContaining('otp_required'),
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
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

    it('should serialize object query params as JSON', async () => {
      mockJsonResponse([]);

      await client().request('get', '/tasks', {
        params: { filter: { status: 'active', team_id: 'team-1' } },
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('filter=');
      expect(decodeURIComponent(calledUrl)).toContain('"status":"active"');
      expect(decodeURIComponent(calledUrl)).toContain('"team_id":"team-1"');
    });

    it('should omit Authorization when getToken returns null', async () => {
      mockJsonResponse({ id: 'task-1' });

      const tokenClient = new HttpClient({ getToken: () => null });
      await tokenClient.request('get', '/tasks/task-1');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('should omit Authorization when getToken returns undefined', async () => {
      mockJsonResponse({ id: 'task-1' });

      const tokenClient = new HttpClient({ getToken: () => undefined });
      await tokenClient.request('get', '/tasks/task-1');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
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

    it('should resolve function-valued headers on each request', async () => {
      mockJsonResponse({ id: 'task-1' });
      mockJsonResponse({ id: 'task-2' });

      let teamId = 'team-a';
      const client = new HttpClient({
        apiKey: 'test-key',
        headers: {
          'X-Team-ID': () => teamId,
          'X-Request-Id': () => 'req-1',
        },
      });

      await client.request('get', '/tasks/task-1');
      teamId = 'team-b';
      await client.request('get', '/tasks/task-2');

      const firstHeaders = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      const secondHeaders = mockFetch.mock.calls[1][1]?.headers as Record<string, string>;
      expect(firstHeaders['X-Team-ID']).toBe('team-a');
      expect(secondHeaders['X-Team-ID']).toBe('team-b');
      expect(firstHeaders['X-Request-Id']).toBe('req-1');
    });

    it('should omit headers when a resolver returns undefined', async () => {
      mockJsonResponse({ id: 'task-1' });

      const client = new HttpClient({
        apiKey: 'test-key',
        headers: {
          'X-Team-ID': () => undefined,
          'X-Custom': 'static',
        },
      });

      await client.request('get', '/tasks/task-1');

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers['X-Team-ID']).toBeUndefined();
      expect(headers['X-Custom']).toBe('static');
    });

    it('should not send X-API-Version (V3 default) and include X-Client-Source', async () => {
      mockJsonResponse({ data: { id: 'task-1' } });

      await client().request('get', '/tasks/task-1');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['X-API-Version']).toBeUndefined();
      expect(headers['X-Client-Source']).toMatch(/^inference-sdk-js\/\d+\.\d+\.\d+$/);
    });

    it('should send X-Client-Source version matching SDK_VERSION', async () => {
      mockJsonResponse({ data: { id: 'task-1' } });
      await client().request('get', '/tasks/task-1');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['X-Client-Source']).toBe(`inference-sdk-js/${SDK_VERSION}`);
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

    it('should preserve entitlement error meta in responseBody for client-side parsing', async () => {
      const entitlementBody = {
        type: 'about:blank',
        title: 'Entitlement limit exceeded',
        detail: 'Seat limit reached',
        meta: {
          resource: 'seats',
          resource_label: 'Team seats',
          limit: 5,
          current: 5,
          upgrade_available: true,
          addon_plan_id: 'plan-addon-seats',
          addon_plan_name: 'Extra Seats',
          addon_plan_price: 1000,
        },
      };
      const responseText = JSON.stringify(entitlementBody);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve(responseText),
      });

      try {
        await client().request('post', '/teams/team-1/members');
        fail('Expected InferenceError');
      } catch (error) {
        expect(error).toMatchObject({
          name: 'InferenceError',
          statusCode: 403,
          message: expect.stringContaining('Seat limit reached'),
          responseBody: responseText,
        });

        const parsed = JSON.parse((error as InferenceError).responseBody!) as {
          meta: { resource: string; upgrade_available: boolean; addon_plan_name?: string };
        };
        expect(parsed.meta.resource).toBe('seats');
        expect(parsed.meta.upgrade_available).toBe(true);
        expect(parsed.meta.addon_plan_name).toBe('Extra Seats');
      }
    });

    it('should unwrap V3 envelope and return data', async () => {
      mockJsonResponse({ data: { id: 'task-123' } });

      const result = await client().request<{ id: string }>('get', '/tasks/123');
      expect(result.data).toEqual({ id: 'task-123' });
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

    it('should include resolved dynamic headers for streaming requests', () => {
      const config = new HttpClient({
        apiKey: 'secret-key',
        headers: { 'X-Team-ID': () => 'team-stream' },
      }).getStreamableConfig('/tasks/task-1/stream');

      expect(config.headers['X-Team-ID']).toBe('team-stream');
      expect(config.headers.Authorization).toBe('Bearer secret-key');
    });

    it('should include credentials for cookie-based auth (default include)', () => {
      const config = new HttpClient({ apiKey: 'secret-key' }).getStreamableConfig(
        '/tasks/task-1/stream'
      );

      expect(config.credentials).toBe('include');
    });

    it('should respect custom credentials mode', () => {
      const config = new HttpClient({
        apiKey: 'secret-key',
        credentials: 'same-origin',
      }).getStreamableConfig('/tasks/task-1/stream');

      expect(config.credentials).toBe('same-origin');
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

    it('should attach resolved dynamic headers on SSE custom fetch', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const client = new HttpClient({
        apiKey: 'sse-key',
        headers: { 'X-Team-ID': () => 'team-sse' },
      });
      await client.createEventSource('/tasks/task-1/stream');

      await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', { headers: {} });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.inference.sh/tasks/task-1/stream',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Team-ID': 'team-sse',
            Authorization: 'Bearer sse-key',
          }),
        })
      );
    });

    it('should use getToken for Authorization on SSE custom fetch', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const client = new HttpClient({ getToken: () => 'session-token' });
      await client.createEventSource('/tasks/task-1/stream');

      await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', { headers: {} });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.inference.sh/tasks/task-1/stream',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer session-token',
          }),
        })
      );
    });

    it('should omit Authorization on SSE fetch when getToken returns null', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const client = new HttpClient({ getToken: () => null });
      await client.createEventSource('/tasks/task-1/stream');

      await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', { headers: {} });

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });

    it('should return EventSource without awaiting the initial fetch', async () => {
      MockEventSource.mockImplementation(() => ({ close: jest.fn() }));

      const client = new HttpClient({ apiKey: 'sse-key' });
      const eventSource = await client.createEventSource('/tasks/task-1/stream');

      expect(eventSource).toBeDefined();
      expect(MockEventSource).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    function mockFailedResponse(status: number, body: string) {
      return {
        ok: false,
        status,
        clone: () => ({
          text: () => Promise.resolve(body),
        }),
      };
    }

    it('should route failed initial SSE response through onError and return retried response', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      const onError = jest.fn(async (_error, retry) => retry());
      const client = new HttpClient({ apiKey: 'sse-key', onError });

      mockFetch
        .mockResolvedValueOnce(
          mockFailedResponse(403, JSON.stringify({ detail: 'otp_required' }))
        )
        .mockResolvedValueOnce({ ok: true, status: 200 });

      await client.createEventSource('/tasks/task-1/stream');
      const response = await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', {});

      expect(onError).toHaveBeenCalledTimes(1);
      const [error] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(InferenceError);
      expect((error as InferenceError).statusCode).toBe(403);
      expect((error as InferenceError).message).toContain('otp_required');
      expect(response).toEqual({ ok: true, status: 200 });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should return original failed response when onError does not retry', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      const failed = mockFailedResponse(401, JSON.stringify({ title: 'Unauthorized' }));
      const onError = jest.fn(async () => undefined);
      const client = new HttpClient({ apiKey: 'sse-key', onError });

      mockFetch.mockResolvedValueOnce(failed);
      await client.createEventSource('/tasks/task-1/stream');

      const response = await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', {});

      expect(onError).toHaveBeenCalledTimes(1);
      expect(response).toBe(failed);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return failed response when no onError handler is configured', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      const failed = mockFailedResponse(503, 'service unavailable');
      const client = new HttpClient({ apiKey: 'sse-key' });

      mockFetch.mockResolvedValueOnce(failed);
      await client.createEventSource('/tasks/task-1/stream');

      const response = await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', {});

      expect(response).toBe(failed);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should propagate when onError rethrows on failed SSE handshake', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      const capturedErrors: unknown[] = [];
      const onError = jest.fn(async (error) => {
        capturedErrors.push(error);
        throw error;
      });
      const client = new HttpClient({ apiKey: 'sse-key', onError });

      mockFetch.mockResolvedValueOnce(
        mockFailedResponse(403, JSON.stringify({ detail: 'otp_required' }))
      );
      await client.createEventSource('/tasks/task-1/stream');

      await expect(
        capturedFetch!('https://api.inference.sh/tasks/task-1/stream', {})
      ).rejects.toMatchObject({
        name: 'InferenceError',
        statusCode: 403,
        message: expect.stringContaining('otp_required'),
      });
      expect(capturedErrors).toHaveLength(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});
