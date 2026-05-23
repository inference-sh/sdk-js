import { HttpClient } from '../http/client';
import { FlowRunsAPI } from './flow-runs';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('FlowRunsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new FlowRunsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST flow and input for create()', async () => {
    const flowRun = { id: 'fr-1', flow: 'flow-1' };
    mockJsonResponse(flowRun);

    const result = await api().create('flow-1', { prompt: 'hi' });

    expect(result).toEqual(flowRun);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      flow: 'flow-1',
      input: { prompt: 'hi' },
    });
  });

  it('should POST /flowruns/{id}/cancel for cancel()', async () => {
    mockJsonResponse(null);

    await api().cancel('fr-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flowruns/fr-1/cancel');
    expect(init.method).toBe('POST');
  });

  it('should open SSE on /flowruns/{id}/stream for stream()', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const createEventSource = jest
      .spyOn(http, 'createEventSource')
      .mockResolvedValue(null);

    const flowRuns = new FlowRunsAPI(http);
    await flowRuns.stream('fr-42');

    expect(createEventSource).toHaveBeenCalledWith('/flowruns/fr-42/stream');
    createEventSource.mockRestore();
  });

  it('should open task SSE for streamTasks()', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const createEventSource = jest
      .spyOn(http, 'createEventSource')
      .mockResolvedValue(null);

    const flowRuns = new FlowRunsAPI(http);
    await flowRuns.streamTasks('fr-42');

    expect(createEventSource).toHaveBeenCalledWith('/flowruns/fr-42/tasks/stream');
    createEventSource.mockRestore();
  });

  it('should POST /flowruns/list for list()', async () => {
    const page = { items: [{ id: 'fr-1' }], next_cursor: null };
    mockJsonResponse({ success: true, data: page });

    const result = await api().list({ limit: 10 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flowruns/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /flowruns/{id} for get()', async () => {
    const flowRun = { id: 'fr-1' };
    mockJsonResponse({ success: true, data: flowRun });

    const result = await api().get('fr-1');

    expect(result).toEqual(flowRun);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flowruns/fr-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /flowruns/{id}/clone for clone()', async () => {
    const flowRun = { id: 'fr-clone' };
    mockJsonResponse({ success: true, data: flowRun });

    const result = await api().clone('fr-1');

    expect(result).toEqual(flowRun);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/flowruns/fr-1/clone');
    expect(init.method).toBe('POST');
  });

  it('should POST /flowruns/{id} for update()', async () => {
    const flowRun = { id: 'fr-1', fail_on_error: false };
    mockJsonResponse({ success: true, data: flowRun });

    const result = await api().update('fr-1', { fail_on_error: false });

    expect(result).toEqual(flowRun);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ fail_on_error: false });
  });

  it('should POST visibility for updateVisibility()', async () => {
    const flowRun = { id: 'fr-1', visibility: 'public' };
    mockJsonResponse({ success: true, data: flowRun });

    await api().updateVisibility('fr-1', 'public');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'public' });
  });
});
