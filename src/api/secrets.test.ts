import { HttpClient } from '../http/client';
import { SecretsAPI } from './secrets';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('SecretsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new SecretsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /secrets/list for list()', async () => {
    const page = { items: [{ key: 'API_KEY' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list({ limit: 10 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/secrets/list');
    expect(init.method).toBe('POST');
  });

  it('should POST /secrets for create()', async () => {
    const payload = { key: 'DB_PASSWORD', value: 'secret' };
    const secret = { key: 'DB_PASSWORD' };
    mockJsonResponse(secret);

    const result = await api().create(payload as never);

    expect(result).toEqual(secret);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/secrets');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should PUT /secrets/{key} for update()', async () => {
    const secret = { key: 'DB_PASSWORD' };
    mockJsonResponse(secret);

    await api().update('DB_PASSWORD', { value: 'new-secret' } as never);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/secrets/DB_PASSWORD');
    expect(init.method).toBe('PUT');
  });

  it('should GET /secrets/reveal/{key} for reveal()', async () => {
    const secret = { key: 'API_KEY', value: 'sk-live-abc' };
    mockJsonResponse(secret);

    const result = await api().reveal('API_KEY');

    expect(result).toEqual(secret);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/secrets/reveal/API_KEY');
    expect(init.method).toBe('GET');
  });

  it('should DELETE /secrets/{key} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('OLD_KEY');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/secrets/OLD_KEY');
    expect(init.method).toBe('DELETE');
  });
});
