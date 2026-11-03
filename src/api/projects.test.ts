import { HttpClient } from '../http/client.js';
import { ProjectsAPI } from './projects.js';

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

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects/list');
    expect(init.method).toBe('POST');
  });

  it('should forward search term and exact match in list() body', async () => {
    mockJsonResponse({ items: [], next_cursor: '' });
    const params = {
      limit: 10,
      search: { term: 'demo', exact: true },
    };

    await api().list(params);

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(params);
  });

  it('should GET /projects/{id} for get()', async () => {
    const project = { id: 'proj-1', name: 'Demo' };
    mockJsonResponse(project);

    const result = await api().get('proj-1');

    expect(result.data).toEqual(project);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects/proj-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /projects for create()', async () => {
    const payload = { name: 'New Project' };
    const project = { id: 'proj-new', ...payload };
    mockJsonResponse(project);

    const result = await api().create(payload);

    expect(result.data).toEqual(project);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects');
    expect(init.method).toBe('POST');
  });

  it('should include visibility on create() but not on update()', async () => {
    mockJsonResponse({ id: 'proj-1' });

    await api().create({ name: 'Team space', type: 'agent', visibility: 'team' });
    const createBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(createBody).toEqual({ name: 'Team space', type: 'agent', visibility: 'team' });

    jest.clearAllMocks();
    mockJsonResponse({ id: 'proj-1' });
    await api().update('proj-1', { name: 'Renamed only' });
    const [, updateInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(updateInit.method).toBe('PATCH');
    expect(JSON.parse(updateInit.body as string)).toEqual({ name: 'Renamed only' });
  });

  it('should DELETE /projects/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('proj-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects/proj-1');
    expect(init.method).toBe('DELETE');
  });

  // A partial body to the full update (POST) blanked the fields left out.
  it('should PATCH /projects/{id} for update()', async () => {
    const project = { id: 'proj-1', name: 'Renamed' };
    mockJsonResponse(project);

    const result = await api().update('proj-1', { name: 'Renamed' });

    expect(result.data).toEqual(project);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/projects/proj-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed' });
  });
});
