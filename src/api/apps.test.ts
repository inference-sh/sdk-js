import { HttpClient } from '../http/client';
import { AppsAPI } from './apps';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('AppsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new AppsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /apps/list for list()', async () => {
    const apps = { items: [{ id: 'app-1' }], next_cursor: null };
    mockJsonResponse({ success: true, data: apps });

    const result = await api().list({ limit: 10 });

    expect(result).toEqual(apps);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 10 });
  });

  it('should GET /apps/{name} for getByName()', async () => {
    const app = { id: 'app-1', name: 'inference/claude-haiku' };
    mockJsonResponse({ success: true, data: app });

    const result = await api().getByName('inference/claude-haiku');

    expect(result).toEqual(app);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/apps/inference/claude-haiku');
  });

  it('should POST transfer with team_id for transferOwnership()', async () => {
    const app = { id: 'app-1' };
    mockJsonResponse({ success: true, data: app });

    await api().transferOwnership('app-1', 'team-99');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1/transfer');
    expect(JSON.parse(init.body as string)).toEqual({ team_id: 'team-99' });
  });

  it('should POST license payload for saveLicense()', async () => {
    const license = { app_id: 'app-1', license: 'key-abc' };
    mockJsonResponse({ success: true, data: license });

    const result = await api().saveLicense('app-1', 'key-abc');

    expect(result).toEqual(license);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ license: 'key-abc' });
  });

  it('should POST version_id for setCurrentVersion()', async () => {
    const app = { id: 'app-1', current_version_id: 'ver-2' };
    mockJsonResponse({ success: true, data: app });

    await api().setCurrentVersion('app-1', 'ver-2');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ version_id: 'ver-2' });
  });

  it('should POST /apps/{id}/duplicate for duplicate()', async () => {
    const app = { id: 'app-copy' };
    mockJsonResponse({ success: true, data: app });

    const result = await api().duplicate('app-1');

    expect(result).toEqual(app);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1/duplicate');
    expect(init.method).toBe('POST');
  });
});
