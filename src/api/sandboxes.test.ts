import { HttpClient } from '../http/client.js';
import { SandboxesAPI } from './sandboxes.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('SandboxesAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new SandboxesAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /sandboxes/list for list()', async () => {
    const page = { items: [{ id: 'sb-1', name: 'dev' }], next_cursor: 'c2', has_next: true };
    mockJsonResponse(page);

    const result = await api().list({ limit: 1 });

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/sandboxes/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 1 });
  });

  it('should GET /sandboxes/{id} for get()', async () => {
    mockJsonResponse({ id: 'sb-1', name: 'dev' });

    const result = await api().get('sb-1');

    expect(result.data).toEqual({ id: 'sb-1', name: 'dev' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/sandboxes/sb-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /sandboxes for create()', async () => {
    mockJsonResponse({ id: 'sb-new', name: 'dev' });

    await api().create({ name: 'dev', vcpus: 4, credentials: [{ slug: 'github-app', mode: 'ask' }] });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/sandboxes$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'dev', vcpus: 4, credentials: [{ slug: 'github-app', mode: 'ask' }] });
  });

  it.each([
    ['start', '/sandboxes/sb-1/start'],
    ['stop', '/sandboxes/sb-1/stop'],
  ] as const)('should POST %s', async (method, path) => {
    mockJsonResponse({ id: 'sb-1', desired_state: method === 'start' ? 'running' : 'stopped' });

    await api()[method]('sb-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(path);
    expect(init.method).toBe('POST');
  });

  it('should DELETE /sandboxes/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('sb-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/sandboxes/sb-1');
    expect(init.method).toBe('DELETE');
  });
});
