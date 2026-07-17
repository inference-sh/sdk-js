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

  it('should forward conversation context in suggest() body', async () => {
    const payload = {
      query: 'flux',
      context: 'previous conversation about image generation',
      limit: 5,
    };
    mockJsonResponse({ results: [] });

    await api().suggest(payload);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should preserve result tag in suggest() responses', async () => {
    const response = {
      query: 'billing',
      results: [
        {
          type: 'skill',
          tag: 'subscription_stats',
          name: 'Usage summary',
          description: 'Show subscription usage stats',
          command: '/usage',
          score: 0.92,
        },
        {
          type: 'app',
          name: 'Stripe',
          description: 'Payment integration',
          command: 'stripe',
          score: 0.71,
        },
      ],
    };
    mockJsonResponse(response);

    const result = await api().suggest({ query: 'billing' });

    expect(result).toEqual(response);
    expect(result.results[0]?.tag).toBe('subscription_stats');
    expect(result.results[1]?.tag).toBeUndefined();
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
