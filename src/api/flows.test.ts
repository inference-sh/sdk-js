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
});
