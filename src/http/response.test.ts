import { HttpClient } from './client';
import type { ResponseMessage } from '../types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown, status = 200, ok = true) {
  mockFetch.mockResolvedValueOnce({
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('Response<T> envelope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const client = () => new HttpClient({ apiKey: 'test-key' });

  it('returns data and messages from V3 envelope', async () => {
    const messages: ResponseMessage[] = [
      {
        level: 'warning',
        code: 'concurrency_limit',
        message: 'You are near your concurrency limit',
        meta: { limit: 10, current: 9 },
      },
    ];
    mockJsonResponse({ data: { id: 'task-123' }, messages });

    const result = await client().request<{ id: string }>('get', '/tasks/123');

    expect(result).toEqual({ data: { id: 'task-123' }, messages });
  });

  it('defaults messages to [] when V3 envelope omits messages key', async () => {
    mockJsonResponse({ data: { id: 'task-123' } });

    const result = await client().request<{ id: string }>('get', '/tasks/123');

    expect(result).toEqual({ data: { id: 'task-123' }, messages: [] });
  });

  it('wraps bare DTO responses with empty messages', async () => {
    mockJsonResponse({ id: 'task-legacy', status: 'completed' });

    const result = await client().request<{ id: string; status: string }>(
      'get',
      '/tasks/legacy'
    );

    expect(result).toEqual({
      data: { id: 'task-legacy', status: 'completed' },
      messages: [],
    });
  });

  it('returns empty messages for 204 No Content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    const result = await client().request<void>('delete', '/tasks/task-1');

    expect(result).toEqual({ data: undefined, messages: [] });
  });

  it('calls onMessage with V3 envelope messages and still returns them on Response', async () => {
    const messages: ResponseMessage[] = [
      {
        level: 'info',
        code: 'deprecation_notice',
        message: 'This endpoint will be deprecated',
      },
    ];
    mockJsonResponse({ data: { id: 'task-123' }, messages });

    const onMessage = jest.fn();
    const httpClient = new HttpClient({ apiKey: 'test-key', onMessage });
    const result = await httpClient.request<{ id: string }>('get', '/tasks/123');

    expect(result).toEqual({ data: { id: 'task-123' }, messages });
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith(messages);
  });

  it('does not call onMessage when V3 envelope has no messages', async () => {
    mockJsonResponse({ data: { id: 'task-123' } });

    const onMessage = jest.fn();
    const httpClient = new HttpClient({ apiKey: 'test-key', onMessage });
    await httpClient.request('get', '/tasks/123');

    expect(onMessage).not.toHaveBeenCalled();
  });

  it('does not call onMessage when V3 envelope messages array is empty', async () => {
    mockJsonResponse({ data: { id: 'task-123' }, messages: [] });

    const onMessage = jest.fn();
    const httpClient = new HttpClient({ apiKey: 'test-key', onMessage });
    await httpClient.request('get', '/tasks/123');

    expect(onMessage).not.toHaveBeenCalled();
  });

  it('preserves Response shape when onError handler retries', async () => {
    const messages: ResponseMessage[] = [
      { level: 'warning', code: 'rate_limit', message: 'Slow down' },
    ];
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
        text: () =>
          Promise.resolve(JSON.stringify({ data: { ok: true }, messages })),
      });

    const result = await httpClient.request<{ ok: boolean }>('get', '/tasks/1');

    expect(result).toEqual({ data: { ok: true }, messages });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
