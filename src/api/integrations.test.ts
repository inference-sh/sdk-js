import { HttpClient } from '../http/client';
import { IntegrationsAPI } from './integrations';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('IntegrationsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new IntegrationsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /integrations/list for list()', async () => {
    const page = { items: [{ provider: 'slack' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/integrations/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /integrations/available for listAvailable()', async () => {
    const available = [{ provider: 'github' }];
    mockJsonResponse(available);

    const result = await api().listAvailable();

    expect(result).toEqual(available);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/integrations/available');
    expect(init.method).toBe('GET');
  });

  it('should POST /integrations for connect()', async () => {
    const payload = { provider: 'slack', config: { token: 'xoxb-123' } };
    const response = { integration: { provider: 'slack' }, redirect_url: null };
    mockJsonResponse(response);

    const result = await api().connect(payload as never);

    expect(result).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/integrations');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /integrations/{provider} for get()', async () => {
    const integration = { provider: 'slack', status: 'connected' };
    mockJsonResponse(integration);

    const result = await api().get('slack');

    expect(result).toEqual(integration);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/integrations/slack');
    expect(init.method).toBe('GET');
  });

  it('should DELETE /integrations/{provider} for disconnect()', async () => {
    mockJsonResponse(null);

    await api().disconnect('slack');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/integrations/slack');
    expect(init.method).toBe('DELETE');
  });
});
