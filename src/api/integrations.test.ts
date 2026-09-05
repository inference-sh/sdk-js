import { HttpClient } from '../http/client';
import { IntegrationsAPI } from './integrations';
import { CredentialScopeUser, IntegrationProviderGoogleSA } from '../types';

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

  it('should POST /credentials/list for list()', async () => {
    const page = { items: [{ provider: 'slack' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result.data).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/list');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('POST');
  });

  it('should forward cursor pagination params in list() body', async () => {
    const page = { items: [], next_cursor: 'cursor-2' };
    mockJsonResponse(page);
    const params = { cursor: 'cursor-1', limit: 25 };

    await api().list(params);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(params);
  });

  it('should GET /credentials/available for listAvailable()', async () => {
    const available = [{ provider: 'github' }];
    mockJsonResponse(available);

    const result = await api().listAvailable();

    expect(result.data).toEqual(available);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/available');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('GET');
  });

  it('should POST /credentials for connect()', async () => {
    const payload = { provider: 'slack', config: { token: 'xoxb-123' } };
    const response = { integration: { provider: 'slack' }, redirect_url: null };
    mockJsonResponse(response);

    const result = await api().connect(payload as never);

    expect(result.data).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/credentials$/);
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should forward connection_scope separately from OAuth scopes in connect()', async () => {
    const payload = {
      provider: 'github',
      type: 'oauth',
      scopes: ['repo'],
      connection_scope: CredentialScopeUser,
    };
    const response = { auth_url: 'https://github.com/login/oauth/authorize' };
    mockJsonResponse(response);

    const result = await api().connect(payload);

    expect(result.data).toEqual(response);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should GET /credentials/{provider} for get()', async () => {
    const integration = { provider: 'slack', status: 'connected' };
    mockJsonResponse(integration);

    const result = await api().get('slack');

    expect(result.data).toEqual(integration);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/slack');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('GET');
  });

  it('should DELETE /credentials/{provider} for disconnect()', async () => {
    mockJsonResponse(null);

    await api().disconnect('slack');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/slack');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('DELETE');
  });

  it('should GET /credentials/configs for getConfigs()', async () => {
    const configs = [{ provider: 'github', scopes: ['repo'] }];
    mockJsonResponse(configs);

    const result = await api().getConfigs();

    expect(result.data).toEqual(configs);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/configs');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('GET');
  });

  it('should GET /credentials/capabilities for getCapabilities()', async () => {
    const capabilities = { slack: ['post_message'] };
    mockJsonResponse(capabilities);

    const result = await api().getCapabilities();

    expect(result.data).toEqual(capabilities);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/capabilities');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('GET');
  });

  it('should POST typed integration requirements with secrets and scopes for checkRequirements()', async () => {
    const payload = {
      integrations: [
        {
          key: IntegrationProviderGoogleSA,
          secrets: ['GOOGLE_SA_JSON'],
          scopes: ['https://www.googleapis.com/auth/calendar'],
        },
      ],
    };
    const response = {
      satisfied: false,
      errors: [
        {
          type: 'scope',
          message: 'Missing calendar scope',
          action: { type: 'add_scopes', provider: IntegrationProviderGoogleSA, scopes: ['https://www.googleapis.com/auth/calendar'] },
        },
      ],
    };
    mockJsonResponse(response);

    const result = await api().checkRequirements(payload);

    expect(result.data).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/check');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });
});
