import { HttpClient } from '../http/client';
import { ArtifactsAPI } from './artifacts';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('ArtifactsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new ArtifactsAPI(new HttpClient({ apiKey: 'test-key', baseUrl: 'https://api.test' }));

  it('should POST /artifacts/list for list()', async () => {
    const page = { items: [{ id: 'art-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/list');
    expect(init.method).toBe('POST');
  });

  it('should POST /artifacts for publish()', async () => {
    const payload = { title: 'Deploy failures', content: '<h1>hi</h1>' };
    const entry = { id: 'art-new', ...payload };
    mockJsonResponse(entry);

    const result = await api().publish(payload);

    expect(result.data).toEqual(entry);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/artifacts$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ ...payload, content: Buffer.from(payload.content).toString('base64'), content_encoding: 'base64' });
  });

  it('should base64-encode script tags in publish() so firewalls accept the JSON body', async () => {
    const content = '<html><script>alert("x")</script><body>ok</body></html>';
    mockJsonResponse({ id: 'art-script' });

    await api().publish({ title: 'Dashboard', content });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.content_encoding).toBe('base64');
    expect(body.content).not.toContain('<script>');
    expect(Buffer.from(body.content, 'base64').toString('utf8')).toBe(content);
  });

  it('should base64-encode publish content when Buffer is unavailable (browser)', async () => {
    const content = '<script>console.log("browser")</script>';
    const savedBuffer = global.Buffer;
    // Simulate browser bundles where Buffer is not polyfilled.
    // @ts-expect-error intentional runtime absence
    delete (global as { Buffer?: typeof Buffer }).Buffer;

    mockJsonResponse({ id: 'art-browser' });
    await api().publish({ title: 'Browser page', content });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.content_encoding).toBe('base64');
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(body.content), (c) => c.charCodeAt(0))
    );
    expect(decoded).toBe(content);

    global.Buffer = savedBuffer;
  });

  it('should POST /artifacts/{id}/versions for publishVersion()', async () => {
    mockJsonResponse({ id: 'art-1', version_id: 'v2' });

    await api().publishVersion('art-1', { content: '<p>v2</p>', label: 'draft' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1/versions');
    expect(init.method).toBe('POST');
  });

  it('should base64-encode content in publishVersion()', async () => {
    const content = '<p>v2</p><script src="/app.js"></script>';
    mockJsonResponse({ id: 'art-1', version_id: 'v2' });

    await api().publishVersion('art-1', { content, label: 'draft', notes: 'second cut' });

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body).toEqual({
      content: Buffer.from(content, 'utf8').toString('base64'),
      content_encoding: 'base64',
      label: 'draft',
      notes: 'second cut',
    });
  });

  it('should GET /artifacts/{id} for get()', async () => {
    const entry = { id: 'art-1', namespace: 'acme', name: 'deploy-failures', title: 'Deploy failures' };
    mockJsonResponse(entry);

    const result = await api().get('art-1');

    expect(result.data).toEqual(entry);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1');
    expect(init.method).toBe('GET');
  });

  it('should GET /artifacts/{namespace}/{name} for getByName()', async () => {
    const entry = { id: 'art-1', namespace: 'acme', name: 'deploy-failures' };
    mockJsonResponse(entry);

    const result = await api().getByName('acme', 'deploy-failures');

    expect(result.data).toEqual(entry);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/acme/deploy-failures');
    expect(init.method).toBe('GET');
  });

  it('should POST metadata updates without re-encoding content', async () => {
    const payload = { title: 'Renamed', description: 'Updated copy', shared_version_id: '' };
    mockJsonResponse({ id: 'art-1', ...payload });

    await api().update('art-1', payload);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/artifacts\/art-1$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should DELETE /artifacts/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('art-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /artifacts/{id}/versions/list for listVersions()', async () => {
    const page = { items: [{ id: 'ver-2', artifact_id: 'art-1', number: 2 }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().listVersions('art-1', { limit: 5 });

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1/versions/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 5 });
  });

  it('should GET /artifacts/{id}/versions/{versionId} for getVersion()', async () => {
    const version = { id: 'ver-1', artifact_id: 'art-1', number: 1, md5: 'abc', size_bytes: 42 };
    mockJsonResponse(version);

    const result = await api().getVersion('art-1', 'ver-1');

    expect(result.data).toEqual(version);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1/versions/ver-1');
    expect(init.method).toBe('GET');
  });

  it('should POST team_id for transferOwnership()', async () => {
    mockJsonResponse({ id: 'art-1' });

    await api().transferOwnership('art-1', 'team-9');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1/transfer');
    expect(JSON.parse(init.body as string)).toEqual({ team_id: 'team-9' });
  });

  it('should POST visibility for updateVisibility()', async () => {
    mockJsonResponse({ id: 'art-1', visibility: 'public' });

    await api().updateVisibility('art-1', 'public');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1/visibility');
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'public' });
  });

  it('should GET the viewer-facing content without a version', async () => {
    mockJsonResponse({ artifact_id: 'art-1', content: '<p>x</p>' });

    await api().getContent('art-1');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1/content');
    expect(url).not.toContain('/versions/');
  });

  it('should GET version content when a version is given', async () => {
    mockJsonResponse({ artifact_id: 'art-1', content: '<p>x</p>' });

    await api().getContent('art-1', 'abcd1234');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1/versions/abcd1234/content');
  });

  it('should pin the shared version via POST /artifacts/{id}', async () => {
    mockJsonResponse({ id: 'art-1', shared_version_id: 'v1' });

    await api().setSharedVersion('art-1', 'v1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/artifacts\/art-1$/);
    expect(JSON.parse(init.body as string)).toEqual({ shared_version_id: 'v1' });
  });

  it('should build render URLs with version and theme', () => {
    expect(api().renderUrl('art-1')).toBe('https://api.test/artifacts/art-1/render');
    expect(api().renderUrl('art-1', { versionId: 'v1', theme: 'dark' })).toBe('https://api.test/artifacts/art-1/render?version=v1&theme=dark');
    expect(api().renderUrl('art-1', { theme: 'light' })).toBe('https://api.test/artifacts/art-1/render?theme=light');
  });
});
