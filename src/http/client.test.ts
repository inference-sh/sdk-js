import { HttpClient, createHttpClient, type FailedRequest } from './client';
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

    it('should tell onError which token the failed request carried', async () => {
      let current = 'old-token';
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => {
        current = 'new-token';
        return retry();
      });
      const httpClient = new HttpClient({ getToken: () => current, onError });

      mockJsonResponse({ detail: 'session expired' }, 401, false);
      mockJsonResponse({ ok: true });

      await httpClient.request('get', '/tasks/1');

      expect(onError.mock.calls[0][2]).toEqual({ token: 'old-token' });
      // The retry reads the token again instead of resending the refused one.
      const [, retried] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect((retried.headers as Record<string, string>).Authorization).toBe('Bearer new-token');
    });

    it('should not send a retry that fails back through onError', async () => {
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => retry());
      const httpClient = new HttpClient({ apiKey: 'key', onError });

      mockJsonResponse({ detail: 'session expired' }, 401, false);
      mockJsonResponse({ detail: 'still expired' }, 401, false);

      await expect(httpClient.request('get', '/tasks/1')).rejects.toMatchObject({
        statusCode: 401,
        message: expect.stringContaining('still expired'),
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][2]).toEqual({ token: 'key' });
    });

    it('should report no token to onError when the request carried none', async () => {
      const onError = jest.fn(async (error: unknown, _retry: () => Promise<unknown>, _request: FailedRequest) => { throw error; });

      mockJsonResponse({ detail: 'unauthorized' }, 401, false);
      await expect(new HttpClient({ getToken: () => '', onError }).request('get', '/tasks/1')).rejects.toBeInstanceOf(InferenceError);
      expect(onError.mock.calls[0][2]).toEqual({ token: undefined });

      // A proxy adds the credential itself, so getToken is not asked.
      const getToken = jest.fn(() => 'unused');
      mockJsonResponse({ detail: 'unauthorized' }, 401, false);
      await expect(
        new HttpClient({ proxyUrl: 'https://app.example.com/proxy', getToken, onError }).request('get', '/tasks/1')
      ).rejects.toBeInstanceOf(InferenceError);
      expect(onError.mock.calls[1][2]).toEqual({ token: undefined });
      expect(getToken).not.toHaveBeenCalled();
    });

    it('should call onError as ever when handleErrors is left out or true', async () => {
      const onError = jest.fn(async (error: unknown, _retry: () => Promise<unknown>, _request: FailedRequest) => { throw error; });
      const httpClient = new HttpClient({ apiKey: 'key', onError });

      mockJsonResponse({ detail: 'forbidden' }, 403, false);
      await expect(httpClient.request('get', '/tasks/1')).rejects.toBeInstanceOf(InferenceError);
      mockJsonResponse({ detail: 'forbidden' }, 403, false);
      await expect(httpClient.request('get', '/tasks/1', { handleErrors: true })).rejects.toBeInstanceOf(InferenceError);

      expect(onError).toHaveBeenCalledTimes(2);
      expect(onError.mock.calls[0][2]).toStrictEqual({ token: 'key' });
      expect(onError.mock.calls[1][2]).toStrictEqual({ token: 'key' });
    });

    it('should not consult onError with handleErrors: false, and throw the refusal as it is', async () => {
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => retry());
      const httpClient = new HttpClient({ apiKey: 'key', onError });

      mockJsonResponse({ detail: 'verify first' }, 403, false);
      await expect(
        httpClient.request('delete', '/tasks/1', { params: { force: true }, data: { why: 'x' }, handleErrors: false })
      ).rejects.toMatchObject({ name: 'InferenceError', statusCode: 403, message: expect.stringContaining('verify first') });

      expect(onError).not.toHaveBeenCalled();
      // Sent once, and the option is the client's alone: it is not on the wire.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://api.inference.sh/tasks/1?force=true');
      expect(init.body).toBe(JSON.stringify({ why: 'x' }));
      expect(JSON.stringify(init.headers)).not.toContain('handleErrors');
    });

    it('should throw the very error of a request that got no response with handleErrors: false', async () => {
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => retry());
      const failure = new TypeError('Failed to fetch');
      mockFetch.mockRejectedValueOnce(failure);

      await expect(new HttpClient({ apiKey: 'key', onError }).request('get', '/tasks/1', { handleErrors: false })).rejects.toBe(failure);

      expect(onError).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should wait for an async getToken, for the request and for its retry', async () => {
      const tokens = ['old-token', 'new-token'];
      const getToken = jest.fn(async () => tokens.shift());
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => retry());
      const httpClient = new HttpClient({ getToken, onError });

      mockJsonResponse({ detail: 'session expired' }, 401, false);
      mockJsonResponse({ ok: true });

      await expect(httpClient.request('get', '/tasks/1')).resolves.toEqual({ data: { ok: true }, messages: [] });
      expect(onError.mock.calls[0][2]).toEqual({ token: 'old-token' });
      const sent = mockFetch.mock.calls.map(([, init]) => (init as { headers: Record<string, string> }).headers.Authorization);
      expect(sent).toEqual(['Bearer old-token', 'Bearer new-token']);
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

  describe('fetch', () => {
    function mockRawResponse(status: number, body: string) {
      const response = new Response(body, { status });
      mockFetch.mockResolvedValueOnce(response);
      return response;
    }

    it('should resolve with the raw response, sent with the client auth, headers and credentials', async () => {
      const response = mockRawResponse(200, 'ignored');
      const controller = new AbortController();
      const httpClient = new HttpClient({
        getToken: () => 'tok',
        headers: { 'X-Team-ID': () => 'team-1' },
        credentials: 'omit',
      });

      const result = await httpClient.fetch('/tasks/task-1/stream', {
        method: 'POST',
        headers: { Accept: 'application/x-ndjson' },
        body: '{}',
        signal: controller.signal,
      });

      expect(result).toBe(response);
      expect(mockFetch).toHaveBeenCalledWith('https://api.inference.sh/tasks/task-1/stream', {
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/x-ndjson',
          Authorization: 'Bearer tok',
          'X-Team-ID': 'team-1',
        }),
        body: '{}',
        signal: controller.signal,
        credentials: 'omit',
      });
    });

    it('should route through the proxy with the target as header and query parameter', async () => {
      mockRawResponse(200, '');
      await new HttpClient({ proxyUrl: 'https://app.example.com/proxy' }).fetch('/tasks/task-1/stream');

      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(new URL(url).searchParams.get('__inf_target')).toBe('https://api.inference.sh/tasks/task-1/stream');
      const headers = init.headers as Record<string, string>;
      expect(headers['x-inf-target-url']).toBe('https://api.inference.sh/tasks/task-1/stream');
      expect(headers.Authorization).toBeUndefined();
    });

    it('should hand a refused response to onError with the token it carried and resolve with the retry', async () => {
      let current = 'old-token';
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => {
        current = 'new-token';
        return retry();
      });
      const httpClient = new HttpClient({ getToken: () => current, onError });

      mockRawResponse(401, JSON.stringify({ detail: 'session expired' }));
      const retried = mockRawResponse(200, '');

      await expect(httpClient.fetch('/tasks/task-1/stream')).resolves.toBe(retried);

      const [error, , request] = onError.mock.calls[0] as unknown as [InferenceError, unknown, unknown];
      expect(error).toBeInstanceOf(InferenceError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('session expired');
      expect(request).toEqual({ token: 'old-token' });
      const [, init] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer new-token');
    });

    it('should throw when the retry is refused too, without asking onError again', async () => {
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => retry());
      const httpClient = new HttpClient({ apiKey: 'key', onError });

      mockRawResponse(401, JSON.stringify({ detail: 'session expired' }));
      mockRawResponse(401, JSON.stringify({ detail: 'still expired' }));

      await expect(httpClient.fetch('/tasks/task-1/stream')).rejects.toMatchObject({
        name: 'InferenceError',
        statusCode: 401,
        message: expect.stringContaining('still expired'),
      });
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('should throw when onError settles the error without a retry', async () => {
      const httpClient = new HttpClient({ apiKey: 'key', onError: async () => undefined });

      mockRawResponse(403, 'forbidden');

      await expect(httpClient.fetch('/tasks/task-1/stream')).rejects.toMatchObject({
        name: 'InferenceError',
        statusCode: 403,
        message: expect.stringContaining('forbidden'),
        responseBody: 'forbidden',
      });
    });

    it('should read a refused body once, into the error onError sees and fetch throws', async () => {
      const onError = jest.fn(async (_error: unknown) => undefined);
      const httpClient = new HttpClient({ apiKey: 'key', onError });

      const refused = mockRawResponse(403, JSON.stringify({ detail: 'forbidden' }));
      const text = jest.spyOn(refused, 'text');
      const clone = jest.spyOn(refused, 'clone');

      const thrown = await httpClient.fetch('/tasks/task-1/stream').catch((error: unknown) => error);

      expect(thrown).toBeInstanceOf(InferenceError);
      expect(thrown).toBe(onError.mock.calls[0][0]);
      expect(text).toHaveBeenCalledTimes(1);
      expect(clone).not.toHaveBeenCalled();
    });

    it('should leave no unread body behind when onError throws', async () => {
      const httpClient = new HttpClient({ apiKey: 'key', onError: async (error) => { throw error; } });

      const refused = mockRawResponse(403, JSON.stringify({ detail: 'forbidden' }));

      await expect(httpClient.fetch('/tasks/task-1/stream')).rejects.toMatchObject({ statusCode: 403 });
      expect(refused.bodyUsed).toBe(true);
    });

    it('should keep the refused response when onError resolves with something that is not a response', async () => {
      const httpClient = new HttpClient({ apiKey: 'key', onError: async () => ({ ok: true, status: 200 }) });

      mockRawResponse(403, 'forbidden');

      await expect(httpClient.fetch('/tasks/task-1/stream')).rejects.toMatchObject({
        name: 'InferenceError',
        statusCode: 403,
      });
    });

    it('should wait for an async getToken', async () => {
      mockRawResponse(200, '');
      await new HttpClient({ getToken: async () => 'tok' }).fetch('/tasks/task-1/stream');

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    });

    it('should hand a request that got no response to onError and resolve with the retry', async () => {
      const failure = new TypeError('Failed to fetch');
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => retry());
      const httpClient = new HttpClient({ apiKey: 'key', onError });

      mockFetch.mockRejectedValueOnce(failure);
      const retried = mockRawResponse(200, '');

      await expect(httpClient.fetch('/tasks/task-1/stream')).resolves.toBe(retried);
      expect(onError).toHaveBeenCalledWith(failure, expect.any(Function), { token: 'key' });
    });

    it('should throw the failure of a request that got no response when onError does not retry', async () => {
      const failure = new TypeError('Failed to fetch');
      const httpClient = new HttpClient({ apiKey: 'key', onError: async () => undefined });

      mockFetch.mockRejectedValueOnce(failure);

      await expect(httpClient.fetch('/tasks/task-1/stream')).rejects.toBe(failure);
    });

    it('should not hand a request its caller aborted to onError', async () => {
      const onError = jest.fn(async () => undefined);
      const httpClient = new HttpClient({ apiKey: 'key', onError });
      const controller = new AbortController();
      controller.abort();
      const aborted = new DOMException('The operation was aborted.', 'AbortError');

      mockFetch.mockRejectedValueOnce(aborted);

      await expect(httpClient.fetch('/tasks/task-1/stream', { signal: controller.signal })).rejects.toBe(aborted);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should throw the error request() would when no onError is configured', async () => {
      mockRawResponse(503, 'service unavailable');
      await expect(new HttpClient({ apiKey: 'key' }).fetch('/x')).rejects.toMatchObject({
        name: 'InferenceError',
        statusCode: 503,
      });

      mockRawResponse(412, JSON.stringify({ errors: [{ type: 'secret', key: 'K', message: 'missing' }] }));
      await expect(new HttpClient({ apiKey: 'key' }).fetch('/x')).rejects.toBeInstanceOf(RequirementsNotMetException);
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

    it('should omit credentials by default with an apiKey (bearer auth, third-party origins)', () => {
      const config = new HttpClient({ apiKey: 'secret-key' }).getStreamableConfig(
        '/tasks/task-1/stream'
      );

      expect(config.credentials).toBe('omit');
    });

    it('should include credentials by default for proxy and getToken flows (cookies)', () => {
      expect(new HttpClient({ proxyUrl: 'https://app.example.com/proxy' }).getStreamableConfig('/x').credentials).toBe('include');
      expect(new HttpClient({ getToken: () => 'tok' }).getStreamableConfig('/x').credentials).toBe('include');
    });

    it('should respect custom credentials mode', () => {
      const config = new HttpClient({
        apiKey: 'secret-key',
        credentials: 'same-origin',
      }).getStreamableConfig('/tasks/task-1/stream');

      expect(config.credentials).toBe('same-origin');
    });
  });

  describe('getStreamableConfig with an async getToken', () => {
    it('should throw, naming fetch() as the way to send the request', () => {
      const httpClient = new HttpClient({ getToken: async () => 'tok' });
      expect(() => httpClient.getStreamableConfig('/tasks/task-1/stream')).toThrow(/async getToken.*fetch\(\)/);
    });

    it('should not ask getToken through a proxy', () => {
      const getToken = jest.fn(async () => 'tok');
      const config = new HttpClient({ proxyUrl: 'https://app.example.com/proxy', getToken }).getStreamableConfig('/x');
      expect(config.headers.Authorization).toBeUndefined();
      expect(getToken).not.toHaveBeenCalled();
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
      return new Response(body, { status });
    }

    it('should route failed initial SSE response through onError and return retried response', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      const onError = jest.fn(async (_error, retry) => retry());
      const client = new HttpClient({ apiKey: 'sse-key', onError });
      const retried = new Response(null, { status: 200 });

      mockFetch
        .mockResolvedValueOnce(
          mockFailedResponse(403, JSON.stringify({ detail: 'otp_required' }))
        )
        .mockResolvedValueOnce(retried);

      await client.createEventSource('/tasks/task-1/stream');
      const response = await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', {});

      expect(onError).toHaveBeenCalledTimes(1);
      const [error] = onError.mock.calls[0];
      expect(error).toBeInstanceOf(InferenceError);
      expect((error as InferenceError).statusCode).toBe(403);
      expect((error as InferenceError).message).toContain('otp_required');
      expect(response).toBe(retried);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should tell onError which token the failed SSE handshake carried, and retry with the current one', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });

      let current = 'old-token';
      const onError = jest.fn(async (_error: unknown, retry: () => Promise<unknown>, _request: FailedRequest) => {
        current = 'new-token';
        return retry();
      });
      const client = new HttpClient({ getToken: () => current, onError });

      mockFetch
        .mockResolvedValueOnce(mockFailedResponse(401, JSON.stringify({ detail: 'session expired' })))
        .mockResolvedValueOnce(mockFailedResponse(401, JSON.stringify({ detail: 'still expired' })));

      await client.createEventSource('/tasks/task-1/stream');
      const response = await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', {});

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][2]).toEqual({ token: 'old-token' });
      const [, retried] = mockFetch.mock.calls[1] as [string, RequestInit];
      expect((retried.headers as Record<string, string>).Authorization).toBe('Bearer new-token');
      // The refused retry goes to the EventSource; onError is not asked twice.
      expect(response.status).toBe(401);
    });

    it('should wait for an async getToken on the SSE handshake', async () => {
      let capturedFetch: ((input: string, init?: RequestInit) => Promise<Response>) | undefined;
      MockEventSource.mockImplementation((_url, options) => {
        capturedFetch = options?.fetch;
        return { close: jest.fn(), onmessage: null, onerror: null };
      });
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 200 }));

      await new HttpClient({ getToken: async () => 'tok' }).createEventSource('/tasks/task-1/stream');
      await capturedFetch!('https://api.inference.sh/tasks/task-1/stream', {});

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
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
