import { HttpClient } from '../http/client';
import { SearchAPI } from './search';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('SearchAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new SearchAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /suggest for suggest()', async () => {
    const payload = { query: 'image gen', types: ['apps', 'skills'] };
    const response = { results: [{ type: 'app', id: 'app-1' }] };
    mockJsonResponse(response);

    const result = await api().suggest(payload as never);

    expect(result).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/suggest');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should POST /search for search()', async () => {
    const payload = { q: 'claude', type: 'apps', limit: 5 };
    const response = { hits: [{ id: 'app-1' }] };
    mockJsonResponse(response);

    const result = await api().search(payload);

    expect(result).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/search');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });
});
