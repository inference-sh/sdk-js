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

  it('should POST /artifacts/{id}/versions for publishVersion()', async () => {
    mockJsonResponse({ id: 'art-1', version_id: 'v2' });

    await api().publishVersion('art-1', { content: '<p>v2</p>', label: 'draft' });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/artifacts/art-1/versions');
    expect(init.method).toBe('POST');
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
  });
});
