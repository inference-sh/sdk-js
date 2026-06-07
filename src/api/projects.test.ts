import { HttpClient } from '../http/client';
import { ProjectsAPI } from './projects';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('ProjectsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new ProjectsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /projects/list for list()', async () => {
    const page = { items: [{ id: 'proj-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list({ limit: 20 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /projects/{id} for get()', async () => {
    const project = { id: 'proj-1', name: 'Demo' };
    mockJsonResponse(project);

    const result = await api().get('proj-1');

    expect(result).toEqual(project);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects/proj-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /projects for create()', async () => {
    const payload = { name: 'New Project' };
    const project = { id: 'proj-new', ...payload };
    mockJsonResponse(project);

    const result = await api().create(payload);

    expect(result).toEqual(project);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects');
    expect(init.method).toBe('POST');
  });

  it('should DELETE /projects/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('proj-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects/proj-1');
    expect(init.method).toBe('DELETE');
  });
});
