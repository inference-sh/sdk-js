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
});
