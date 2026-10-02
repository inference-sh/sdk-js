import { HttpClient } from '../http/client';
import { ApiKeysAPI } from './api-keys';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('ApiKeysAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new ApiKeysAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /apikeys/list for list()', async () => {
    const page = { items: [{ id: 'key-1', name: 'CI' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys/list');
    expect(init.method).toBe('POST');
  });

  it('should POST /apikeys for create()', async () => {
    const payload = { name: 'deploy-bot', scopes: ['tasks:read'] };
    const key = { id: 'key-new', ...payload, key: 'inf_sk_abc' };
    mockJsonResponse(key);

    const result = await api().create(payload);

    expect(result.data).toEqual(key);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should omit last_used_at on create() for a key that has never been used', async () => {
    const payload = { name: 'fresh-key', scopes: ['tasks:read'] };
    const key = {
      id: 'key-unused',
      ...payload,
      key: 'inf_sk_unused',
      scope: 'user',
      created_by: 'user-1',
      scopes: ['tasks:read'],
    };
    mockJsonResponse(key);

    const result = await api().create(payload);

    expect(result.data).toEqual(key);
    expect(result.data).not.toHaveProperty('last_used_at');
  });

  it('should preserve last_used_at on list() when the key has been used', async () => {
    const lastUsed = '2026-10-01T12:00:00Z';
    const page = {
      items: [
        {
          id: 'key-never-used',
          name: 'unused',
          key: 'inf_sk_a',
          scope: 'user',
          created_by: 'user-1',
          scopes: ['tasks:read'],
        },
        {
          id: 'key-used',
          name: 'active',
          key: 'inf_sk_b',
          scope: 'user',
          created_by: 'user-1',
          scopes: ['tasks:read'],
          last_used_at: lastUsed,
        },
      ],
      next_cursor: null,
    };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result.data?.items[0]).not.toHaveProperty('last_used_at');
    expect(result.data?.items[1].last_used_at).toBe(lastUsed);
  });

  it('should DELETE /apikeys/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('key-9');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys/key-9');
    expect(init.method).toBe('DELETE');
  });
});
