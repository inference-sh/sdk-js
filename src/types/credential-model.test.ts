import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  AuthSchemeAPIKey,
  AuthSchemeAPIKeyInHeader,
  AuthSchemeFlowAuthorizationCode,
  AuthSchemeHTTP,
  AuthSchemeHTTPBearer,
  AuthSchemeOAuth2,
  AuthSchemeOAuth2AuthorizationCode,
  AuthSchemeRefreshWhenExpiring,
  CredentialProviderMCP,
  CredentialTypeMCP,
  type AuthSchemeKind,
  type AuthSchemeSpec,
  type CheckRequirementsRequest,
  type CredentialConfigDTO,
  type CredentialRequirement,
  type CredentialRequirements,
  type MCPServerDTO,
  type ProviderSeed,
  type ProviderSummary,
} from '../types.js';

/**
 * Types regen d56b02e (credential model): slug-keyed CredentialRequirement,
 * ProviderSeed / ProviderSummary, AuthSchemeSpec constants, MCP server credentials.
 */
describe('credential model types (d56b02e)', () => {
  it('exports AuthScheme kind constants from the main barrel', () => {
    expect(main.AuthSchemeOAuth2).toBe('oauth2');
    expect(main.AuthSchemeAPIKey).toBe('api_key');
    expect(main.AuthSchemeHTTP).toBe('http');
    expect(AuthSchemeOAuth2AuthorizationCode).toBe(AuthSchemeOAuth2);
  });

  it('keeps AuthSchemeKind literals stable for generated auth scheme rows', () => {
    const kinds: AuthSchemeKind[] = [AuthSchemeOAuth2, AuthSchemeAPIKey, AuthSchemeHTTP];
    expect(kinds).toEqual(['oauth2', 'api_key', 'http']);
    expect(AuthSchemeFlowAuthorizationCode).toBe('authorization_code');
    expect(AuthSchemeAPIKeyInHeader).toBe('header');
    expect(AuthSchemeHTTPBearer).toBe('bearer');
    expect(AuthSchemeRefreshWhenExpiring).toBe('');
  });

  it('exports MCP credential provider/type constants', () => {
    expect(CredentialProviderMCP).toBe('mcp');
    expect(CredentialTypeMCP).toBe('mcp');
    expect(main.CredentialProviderMCP).toBe('mcp');
  });

  it('models slug-keyed manifest credentials with provider seed and auth scheme', () => {
    const provider: ProviderSeed = {
      name: 'Acme CRM',
      website: 'acme.com',
      docs_uri: 'https://docs.acme.com',
    };
    const auth: AuthSchemeSpec = {
      kind: AuthSchemeAPIKey,
      in: AuthSchemeAPIKeyInHeader,
      param_name: 'X-API-Key',
      fields: [{ key: 'ACME_API_KEY', label: 'API key', sensitive: true }],
    };
    const entry: CredentialRequirement = {
      slug: 'acme',
      secrets: ['ACME_API_KEY'],
      provider,
      auth,
    };
    const manifest: CredentialRequirements = [
      entry,
      { slug: 'slack', capabilities: ['slack.channels.write'] },
    ];
    const check: CheckRequirementsRequest = { credentials: manifest };

    expect(check.credentials?.[0]?.slug).toBe('acme');
    expect(check.credentials?.[0]?.provider?.name).toBe('Acme CRM');
    expect(check.credentials?.[0]?.auth?.kind).toBe('api_key');
    expect(check.credentials?.[1]?.capabilities).toEqual(['slack.channels.write']);
  });

  it('types catalog views with provider_info grouping on CredentialConfigDTO', () => {
    const providerInfo: ProviderSummary = {
      slug: 'acme-corp',
      name: 'Acme Corporation',
      website: 'https://acme.com',
      docs_url: 'https://docs.acme.com',
    };
    const config: CredentialConfigDTO = {
      slug: 'acme-api',
      provider: 'acme-api',
      provider_info: providerInfo,
      type: 'api_key',
      name: 'Acme API',
      short_name: 'Acme',
      description: 'Acme CRM API key',
      allows_byok: true,
      available: true,
      has_managed: false,
      connection_scope: 'team',
    };

    expect(config.provider).toBe('acme-api');
    expect(config.provider_info?.slug).toBe('acme-corp');
  });

  it('types MCP server directory entries with credential requirements', () => {
    const server: MCPServerDTO = {
      id: 'mcp-1',
      user_id: 'u1',
      team_id: 't1',
      visibility: 'private',
      slug: 'entra-mcp',
      name: 'Entra MCP',
      title: 'Entra MCP',
      description: 'Microsoft Entra tools',
      icon_url: '',
      server_url: 'https://mcp.example.com',
      auth_type: 'oauth',
      default_scopes: [],
      documentation_url: 'https://docs.example.com',
      credentials: [{ slug: 'microsoft-entra', scopes: ['User.Read'] }],
      credential_slug: 'microsoft-entra',
    };

    expect(server.credential_slug).toBe('microsoft-entra');
    expect(server.credentials?.[0]?.slug).toBe('microsoft-entra');
  });

  it('keeps d56b02e generated credential model fragments in types.ts after regen', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');

    expect(source).toMatch(/export type CredentialRequirements = CredentialRequirement\[\]/);
    expect(source).toMatch(/export interface ProviderSeed \{/);
    expect(source).toMatch(/export interface ProviderSummary \{/);
    expect(source).toMatch(/provider_info\?: ProviderSummary/);
    expect(source).toMatch(/credentials\?: CredentialRequirements/);
    expect(source).toMatch(/credential_slug\?: string/);
    expect(source).toMatch(/export interface ConnectTokens \{/);
    expect(source).toMatch(/export const AuthSchemeOAuth2: AuthSchemeKind = "oauth2"/);
    expect(source).toMatch(/export interface AuthSchemeSpec \{/);

    const requirement = source.match(/export interface CredentialRequirement \{[\s\S]*?\n\}/);
    expect(requirement).not.toBeNull();
    expect(requirement![0]).toMatch(/slug\?: string/);
    expect(requirement![0]).toMatch(/capabilities\?: string\[\]/);
    expect(requirement![0]).toMatch(/provider\?: ProviderSeed/);
    expect(requirement![0]).toMatch(/auth\?: AuthSchemeSpec/);
    expect(requirement![0]).not.toMatch(/^\s+key\?: string/m);
  });
});
