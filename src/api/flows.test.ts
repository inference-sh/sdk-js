import { HttpClient } from '../http/client';
import { FlowsAPI } from './flows';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('FlowsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new FlowsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST name for create()', async () => {
    const flow = { id: 'flow-1', name: 'My Flow' };
    mockJsonResponse(flow);

    const result = await api().create('My Flow');

    expect(result).toEqual(flow);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'My Flow' });
  });

  it('should POST /flows/{id}/app for createApp()', async () => {
    const app = { id: 'app-from-flow' };
    mockJsonResponse(app);

    const result = await api().createApp('flow-1');

    expect(result).toEqual(app);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/flows/flow-1/app');
  });

  it('should open SSE on /flows/{id}/stream for stream()', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const createEventSource = jest
      .spyOn(http, 'createEventSource')
      .mockResolvedValue(null);

    const flows = new FlowsAPI(http);
    await flows.stream('flow-5');

    expect(createEventSource).toHaveBeenCalledWith('/flows/flow-5/stream');
    createEventSource.mockRestore();
  });

  it('should POST /flows/list for list()', async () => {
    const page = { items: [{ id: 'flow-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list({ limit: 10 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flows/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /flows/{id} for get()', async () => {
    const flow = { id: 'flow-1', name: 'Demo' };
    mockJsonResponse(flow);

    const result = await api().get('flow-1');

    expect(result).toEqual(flow);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flows/flow-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /flows/{id} for update()', async () => {
    const flow = { id: 'flow-1', name: 'Renamed' };
    mockJsonResponse(flow);

    const result = await api().update('flow-1', { name: 'Renamed' });

    expect(result).toEqual(flow);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed' });
  });

  it('should DELETE /flows/{id} for delete()', async () => {
    mockJsonResponse({ success: true, data: null });

    await api().delete('flow-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flows/flow-1');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /flows/{id}/duplicate for duplicate()', async () => {
    const flow = { id: 'flow-copy' };
    mockJsonResponse(flow);

    const result = await api().duplicate('flow-1');

    expect(result).toEqual(flow);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/flows/flow-1/duplicate');
  });

  it('should POST /flows/{id}/versions/list for listVersions()', async () => {
    const versions = { items: [{ id: 'ver-1' }], next_cursor: null };
    mockJsonResponse(versions);

    const result = await api().listVersions('flow-1');

    expect(result).toEqual(versions);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/flows/flow-1/versions/list');
  });

  it('should POST transfer with team_id for transferOwnership()', async () => {
    const flow = { id: 'flow-1' };
    mockJsonResponse({ success: true, data: flow });

    await api().transferOwnership('flow-1', 'team-42');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ team_id: 'team-42' });
  });
});
