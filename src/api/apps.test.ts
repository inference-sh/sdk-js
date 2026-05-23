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
    mockJsonResponse(apps);

    const result = await api().list({ limit: 10 });

    expect(result).toEqual(apps);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 10 });
  });

  it('should GET /apps/{name} for getByName()', async () => {
    const app = { id: 'app-1', name: 'inference/claude-haiku' };
    mockJsonResponse(app);

    const result = await api().getByName('inference/claude-haiku');

    expect(result).toEqual(app);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/apps/inference/claude-haiku');
  });

  it('should POST transfer with team_id for transferOwnership()', async () => {
    const app = { id: 'app-1' };
    mockJsonResponse(app);

    await api().transferOwnership('app-1', 'team-99');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1/transfer');
    expect(JSON.parse(init.body as string)).toEqual({ team_id: 'team-99' });
  });

  it('should POST license payload for saveLicense()', async () => {
    const license = { app_id: 'app-1', license: 'key-abc' };
    mockJsonResponse(license);

    const result = await api().saveLicense('app-1', 'key-abc');

    expect(result).toEqual(license);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ license: 'key-abc' });
  });

  it('should PUT /apps/{id}/versions/{versionId}/current for setCurrentVersion()', async () => {
    const app = { id: 'app-1', current_version_id: 'ver-2' };
    mockJsonResponse(app);

    await api().setCurrentVersion('app-1', 'ver-2');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1/versions/ver-2/current');
    expect(init.method).toBe('PUT');
  });

  it('should POST /apps/{id}/duplicate for duplicate()', async () => {
    const app = { id: 'app-copy' };
    mockJsonResponse(app);

    const result = await api().duplicate('app-1');

    expect(result).toEqual(app);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1/duplicate');
    expect(init.method).toBe('POST');
  });

  it('should GET /apps/{id} for get()', async () => {
    const app = { id: 'app-1', name: 'demo' };
    mockJsonResponse({ success: true, data: app });

    const result = await api().get('app-1');

    expect(result).toEqual(app);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1');
    expect(init.method).toBe('GET');
  });

  it('should GET versioned app for getByVersionId()', async () => {
    const app = { id: 'app-1', version_id: 'ver-1' };
    mockJsonResponse({ success: true, data: app });

    const result = await api().getByVersionId('app-1', 'ver-1');

    expect(result).toEqual(app);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/apps/app-1/versions/ver-1');
  });

  it('should POST /apps for create()', async () => {
    const app = { id: 'app-new', name: 'New App' };
    mockJsonResponse({ success: true, data: app });

    const result = await api().create({ name: 'New App' });

    expect(result).toEqual(app);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'New App' });
  });

  it('should POST /apps/{id} for update()', async () => {
    const app = { id: 'app-1', description: 'updated' };
    mockJsonResponse({ success: true, data: app });

    const result = await api().update('app-1', { description: 'updated' });

    expect(result).toEqual(app);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1');
    expect(JSON.parse(init.body as string)).toEqual({ description: 'updated' });
  });

  it('should DELETE /apps/{id} for delete()', async () => {
    mockJsonResponse({ success: true, data: null });

    await api().delete('app-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /apps/{id}/versions/list for listVersions()', async () => {
    const versions = { items: [{ id: 'ver-1' }], next_cursor: null };
    mockJsonResponse({ success: true, data: versions });

    const result = await api().listVersions('app-1', { limit: 20 });

    expect(result).toEqual(versions);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/app-1/versions/list');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 20 });
  });

  it('should POST visibility for updateVisibility()', async () => {
    const app = { id: 'app-1', visibility: 'private' };
    mockJsonResponse({ success: true, data: app });

    await api().updateVisibility('app-1', 'private');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'private' });
  });

  it('should GET /apps/{id}/license for getLicense()', async () => {
    const license = { app_id: 'app-1', license: 'MIT' };
    mockJsonResponse({ success: true, data: license });

    const result = await api().getLicense('app-1');

    expect(result).toEqual(license);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/apps/app-1/license');
  });
});
