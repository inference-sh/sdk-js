import { HttpClient } from '../http/client';
import { SessionsAPI } from './sessions';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('SessionsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new SessionsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should GET /sessions/{id} for get()', async () => {
    const session = { id: 'sess_1', status: 'active' };
    mockJsonResponse({ success: true, data: session });

    const result = await api().get('sess_1');

    expect(result).toEqual(session);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/sessions/sess_1');
    expect(init.method).toBe('GET');
  });

  it('should return an empty array when list() response is null', async () => {
    mockJsonResponse({ success: true, data: null });

    const result = await api().list();

    expect(result).toEqual([]);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/sessions');
  });

  it('should POST /sessions/{id}/keepalive for keepalive()', async () => {
    const session = { id: 'sess_2', status: 'active' };
    mockJsonResponse({ success: true, data: session });

    const result = await api().keepalive('sess_2');

    expect(result).toEqual(session);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/sessions/sess_2/keepalive');
    expect(init.method).toBe('POST');
  });

  it('should DELETE /sessions/{id} for end()', async () => {
    mockJsonResponse({ success: true, data: null });

    await api().end('sess_3');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/sessions/sess_3');
    expect(init.method).toBe('DELETE');
  });
});
