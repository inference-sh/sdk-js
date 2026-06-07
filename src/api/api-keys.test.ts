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

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys/list');
    expect(init.method).toBe('POST');
  });

  it('should POST /apikeys for create()', async () => {
    const payload = { name: 'deploy-bot', scopes: ['tasks:read'] };
    const key = { id: 'key-new', ...payload, key: 'inf_sk_abc' };
    mockJsonResponse(key);

    const result = await api().create(payload);

    expect(result).toEqual(key);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should DELETE /apikeys/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('key-9');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apikeys/key-9');
    expect(init.method).toBe('DELETE');
  });
});
