import { HttpClient, createHttpClient } from './client';
import { InferenceError, RequirementsNotMetException } from './errors';

const mockFetch = jest.fn();
global.fetch = mockFetch;

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
      mockJsonResponse({ success: true, data: { id: 'task-1' } });

      const result = await client().request<{ id: string }>('get', '/tasks/task-1');
      expect(result).toEqual({ id: 'task-1' });
    });

    it('should return null when success is true but data field is omitted', async () => {
      mockJsonResponse({ success: true });

      const result = await client().request<null>('post', '/tasks/task-1/cancel');
      expect(result).toBeNull();
    });

    it('should return null when success is true with explicit data: null', async () => {
      mockJsonResponse({ success: true, data: null });

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

    it('should throw InferenceError when success is false', async () => {
      mockJsonResponse({ success: false, error: { message: 'Invalid request' } });

      await expect(client().request('get', '/tasks/1')).rejects.toMatchObject({
        name: 'InferenceError',
        message: expect.stringContaining('Invalid request'),
      });
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
          text: () => Promise.resolve(JSON.stringify({ success: true, data: { ok: true } })),
        });

      const result = await httpClient.request<{ ok: boolean }>('get', '/tasks/1');
      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should route through proxy with x-inf-target-url header', async () => {
      const proxyClient = new HttpClient({ proxyUrl: 'https://proxy.example.com' });
      mockJsonResponse({ success: true, data: { id: '1' } });

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
      mockJsonResponse({ success: true, data: [] });

      await client().request('get', '/tasks', {
        params: { ids: ['a', 'b'] },
      });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('ids=');
      expect(decodeURIComponent(calledUrl)).toContain('["a","b"]');
    });
  });
});
