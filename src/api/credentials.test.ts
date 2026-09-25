import { HttpClient } from '../http/client';
import { CredentialsAPI } from './credentials';
import {
  CredentialGrantCredentials,
  CredentialGrantToken,
  CredentialProviderGoogleSA,
  CredentialScopeTeam,
  CredentialScopeUser,
} from '../types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('CredentialsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new CredentialsAPI(new HttpClient({ apiKey: 'test-key' }));

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

  it('should deserialize auth_scheme_id on listAvailable() catalog entries', async () => {
    const available = [
      {
        slug: 'team-oauth',
        provider: 'custom',
        type: 'oauth2',
        name: 'Team OAuth',
        short_name: 'OAuth',
        description: 'Custom auth scheme',
        allows_byok: true,
        available: true,
        has_managed: false,
        auth_scheme_id: 'asch_abc',
      },
    ];
    mockJsonResponse(available);

    const result = await api().listAvailable();

    expect(result.data[0]?.auth_scheme_id).toBe('asch_abc');
    expect(result.data[0]).not.toHaveProperty('custom_provider_id');
  });

  it('should deserialize connection_scope and nested app/credential grants on listAvailable()', async () => {
    const available = [
      {
        slug: 'github',
        provider: 'github',
        type: 'oauth',
        name: 'GitHub',
        short_name: 'GitHub',
        description: 'GitHub OAuth',
        allows_byok: false,
        available: true,
        has_managed: true,
        connection_scope: CredentialScopeUser,
        app: {
          id: 'cred-app',
          user_id: 'user-1',
          team_id: 'team-1',
          visibility: 'private',
          provider: 'github',
          type: 'oauth',
          grant: CredentialGrantCredentials,
          scope: CredentialScopeTeam,
          status: 'connected',
          display_name: 'GitHub app',
          scopes: [],
          is_primary: false,
        },
        credential: {
          id: 'cred-login',
          user_id: 'user-1',
          team_id: 'team-1',
          visibility: 'private',
          provider: 'github',
          type: 'oauth',
          grant: CredentialGrantToken,
          app_credential_id: 'cred-app',
          scope: CredentialScopeUser,
          status: 'connected',
          display_name: 'GitHub login',
          scopes: ['repo'],
          is_primary: true,
        },
      },
    ];
    mockJsonResponse(available);

    const result = await api().listAvailable();

    expect(result.data[0]?.connection_scope).toBe(CredentialScopeUser);
    expect(result.data[0]?.app?.grant).toBe(CredentialGrantCredentials);
    expect(result.data[0]?.credential?.grant).toBe(CredentialGrantToken);
    expect(result.data[0]?.credential?.app_credential_id).toBe('cred-app');
    expect(result.data[0]).not.toHaveProperty('grant');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/available');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('GET');
  });

  it('should POST /credentials for connect()', async () => {
    const payload = { provider: 'slack', config: { token: 'xoxb-123' } };
    const response = { credential: { provider: 'slack' }, redirect_url: null };
    mockJsonResponse(response);

    const result = await api().connect(payload as never);

    expect(result.data).toEqual(response);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/credentials$/);
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('should deserialize grant and app_credential_id on get()', async () => {
    const credential = {
      id: 'cred-1',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      provider: 'slack',
      type: 'oauth',
      grant: CredentialGrantToken,
      app_credential_id: 'cred-slack-app',
      scope: CredentialScopeTeam,
      status: 'connected',
      display_name: 'Slack',
      scopes: ['chat:write'],
      is_primary: true,
    };
    mockJsonResponse(credential);

    const result = await api().get('slack');

    expect(result.data?.grant).toBe(CredentialGrantToken);
    expect(result.data?.app_credential_id).toBe('cred-slack-app');
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

  it('should deserialize connection_scope on getConfigs() merged views', async () => {
    const configs = [
      {
        slug: 'slack',
        provider: 'slack',
        type: 'oauth',
        name: 'Slack',
        short_name: 'Slack',
        description: 'Slack workspace',
        allows_byok: true,
        available: true,
        has_managed: false,
        connection_scope: CredentialScopeTeam,
      },
    ];
    mockJsonResponse(configs);

    const result = await api().getConfigs();

    expect(result.data[0]?.connection_scope).toBe(CredentialScopeTeam);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/credentials/configs');
    expect(url).not.toContain('/integrations/');
    expect(init.method).toBe('GET');
  });

  it('should deserialize auth_scheme_id on getConfigs() merged views', async () => {
    const configs = [
      {
        slug: 'team-api-key',
        provider: 'custom',
        type: 'api_key',
        name: 'Team API key',
        short_name: 'API key',
        description: 'BYOK auth scheme',
        allows_byok: true,
        available: true,
        has_managed: false,
        auth_scheme_id: 'asch_cfg_1',
      },
    ];
    mockJsonResponse(configs);

    const result = await api().getConfigs();

    expect(result.data[0]?.auth_scheme_id).toBe('asch_cfg_1');
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

  it('should POST typed credential requirements with secrets and scopes for checkRequirements()', async () => {
    const payload = {
      credentials: [
        {
          key: CredentialProviderGoogleSA,
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
          action: { type: 'add_scopes', provider: CredentialProviderGoogleSA, scopes: ['https://www.googleapis.com/auth/calendar'] },
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

  it('should POST provider/name/website requirements and return SetupAction secrets for checkRequirements()', async () => {
    const payload = {
      credentials: [
        {
          provider: 'acme',
          name: 'Acme CRM',
          website: 'acme.com',
          secrets: ['ACME_API_KEY'],
        },
      ],
    };
    const response = {
      satisfied: false,
      errors: [
        {
          type: 'credential',
          key: 'acme',
          message: 'Connect Acme CRM',
          action: {
            type: 'add_secret',
            provider: 'acme',
            provider_name: 'Acme CRM',
            secrets: ['ACME_API_KEY'],
            provider_website: 'acme.com',
          },
        },
      ],
    };
    mockJsonResponse(response);

    const result = await api().checkRequirements(payload);

    expect(result.data).toEqual(response);
    expect(JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual(payload);
  });
});
