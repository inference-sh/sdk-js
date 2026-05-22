import { HttpClient } from '../http/client';
import { EnginesAPI } from './engines';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('EnginesAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new EnginesAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST resource ids for getForResources()', async () => {
    const engines = [{ id: 'eng-1' }];
    mockJsonResponse(engines);

    const result = await api().getForResources({
      app_ids: ['app-1'],
      agent_ids: ['agent-1'],
    });

    expect(result).toEqual(engines);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/resources');
    expect(JSON.parse(init.body as string)).toEqual({
      app_ids: ['app-1'],
      agent_ids: ['agent-1'],
    });
  });

  it('should POST /engines/{id}/stop for stop()', async () => {
    mockJsonResponse(null);

    await api().stop('eng-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/eng-1/stop');
    expect(init.method).toBe('POST');
  });

  it('should POST /engines/{id}/restart for restart()', async () => {
    mockJsonResponse(null);

    await api().restart('eng-1');

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/engines/eng-1/restart');
  });

  it('should open SSE on /engines/{id}/stream for stream()', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const createEventSource = jest
      .spyOn(http, 'createEventSource')
      .mockResolvedValue(null);

    const engines = new EnginesAPI(http);
    await engines.stream('eng-7');

    expect(createEventSource).toHaveBeenCalledWith('/engines/eng-7/stream');
    createEventSource.mockRestore();
  });
});
