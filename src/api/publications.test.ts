import { HttpClient } from '../http/client.js';
import { PublicationsAPI } from './publications.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function call(): [string, RequestInit] {
  return mockFetch.mock.calls[0] as [string, RequestInit];
}

describe('PublicationsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new PublicationsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should GET /publications by resource for list()', async () => {
    mockJsonResponse([{ id: 'pub-1' }]);

    const result = await api().list('agent', 'agent-1');

    expect(result.data).toEqual([{ id: 'pub-1' }]);
    const url = new URL(call()[0]);
    expect(url.pathname).toBe('/publications');
    expect(url.searchParams.get('resource_type')).toBe('agent');
    expect(url.searchParams.get('resource_id')).toBe('agent-1');
    expect(call()[1].method).toBe('GET');
  });

  it('should GET /publications/{id} for get()', async () => {
    mockJsonResponse({ id: 'pub-1' });

    await api().get('pub-1');

    expect(call()[0]).toContain('/publications/pub-1');
    expect(call()[1].method).toBe('GET');
  });

  it('should POST /publications for create()', async () => {
    mockJsonResponse({ id: 'pub-1' });

    await api().create({ resource_type: 'agent', resource_id: 'agent-1', allowed_origins: ['https://example.com'] });

    expect(call()[0]).toMatch(/\/publications$/);
    expect(call()[1].method).toBe('POST');
    expect(JSON.parse(call()[1].body as string)).toEqual({
      resource_type: 'agent',
      resource_id: 'agent-1',
      allowed_origins: ['https://example.com'],
    });
  });

  it.each([
    ['update', 'PUT'],
    ['patch', 'PATCH'],
  ] as const)('should %s /publications/{id} with %s', async (method, verb) => {
    mockJsonResponse({ id: 'pub-1' });

    await api()[method]('pub-1', { allowed_origins: ['https://a.example'], enabled: true });

    expect(call()[0]).toContain('/publications/pub-1');
    expect(call()[1].method).toBe(verb);
    expect(JSON.parse(call()[1].body as string)).toEqual({ allowed_origins: ['https://a.example'], enabled: true });
  });

  it('should DELETE /publications/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('pub-1');

    expect(call()[0]).toContain('/publications/pub-1');
    expect(call()[1].method).toBe('DELETE');
  });
});
