import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import * as types from '../types.js';
import {
  AuthMethodAPIKey,
  AuthMethodAPIKeyInHeader,
  AuthMethodClientAuthNone,
  AuthMethodFlowAuthorizationCode,
  AuthMethodHTTP,
  AuthMethodHTTPBearer,
  AuthMethodOAuth2,
  AuthMethodOAuth2AuthorizationCode,
  AuthMethodRefreshAlways,
  CredentialScopeTeam,
  type AuthMethod,
  type AuthMethodKind,
  type CompanySeed,
  type CompanySummary,
  type CredentialConfigDTO,
  type CredentialRequirement,
} from '../types.js';

/**
 * types regen 0c7fe26 (INF-1079): AuthScheme* → AuthMethod*, ProviderSeed →
 * CompanySeed, ProviderSummary → CompanySummary; CredentialConfigDTO.company
 * mirrors provider_info for one release.
 */
describe('auth method vocabulary (INF-1079 / 0c7fe26)', () => {
  it('exports AuthMethod* constants from types and the main barrel', () => {
    expect(AuthMethodOAuth2).toBe('oauth2');
    expect(AuthMethodAPIKey).toBe('api_key');
    expect(AuthMethodHTTP).toBe('http');
    expect(AuthMethodFlowAuthorizationCode).toBe('authorization_code');
    expect(AuthMethodAPIKeyInHeader).toBe('header');
    expect(AuthMethodHTTPBearer).toBe('bearer');
    expect(AuthMethodClientAuthNone).toBe('none');
    expect(AuthMethodRefreshAlways).toBe('always');

    expect(main.AuthMethodOAuth2).toBe('oauth2');
    expect(main.AuthMethodAPIKey).toBe('api_key');
    expect(main.AuthMethodHTTP).toBe('http');
  });

  it('does not export renamed-away AuthScheme* or Provider* symbols', () => {
    const legacy = [
      'AuthSchemeOAuth2',
      'AuthSchemeSpec',
      'AuthSchemeKind',
      'ProviderSeed',
      'ProviderSummary',
    ];
    for (const key of legacy) {
      expect(key in types).toBe(false);
      expect(key in main).toBe(false);
    }
  });

  it('keeps deprecated oauth2_authorization_code kind aliased to oauth2', () => {
    expect(AuthMethodOAuth2AuthorizationCode).toBe(AuthMethodOAuth2);
    expect(main.AuthMethodOAuth2AuthorizationCode).toBe(main.AuthMethodOAuth2);
  });

  it('keeps auth method kind literals stable for OpenAPI security scheme mapping', () => {
    const kinds: AuthMethodKind[] = [AuthMethodOAuth2, AuthMethodAPIKey, AuthMethodHTTP];
    expect(kinds).toEqual(['oauth2', 'api_key', 'http']);
  });
});

describe('company fields on credential catalog (INF-1079)', () => {
  it('types CredentialConfigDTO with company alongside legacy provider_info', () => {
    const company: CompanySummary = {
      slug: 'slack-inc',
      name: 'Slack',
      icon_url: 'https://cdn.example/slack.png',
      website: 'https://slack.com',
    };
    const dto: CredentialConfigDTO = {
      slug: 'slack',
      provider: 'slack',
      provider_info: company,
      company,
      type: 'oauth2',
      name: 'Slack',
      short_name: 'Slack',
      description: 'Team messaging',
      allows_byok: false,
      available: true,
      has_managed: true,
      connection_scope: CredentialScopeTeam,
      multi_account: false,
    };
    expect(dto.company?.slug).toBe('slack-inc');
    expect(dto.provider_info?.name).toBe('Slack');
  });

  it('types CredentialRequirement with CompanySeed and AuthMethod for manifest auth', () => {
    const provider: CompanySeed = { name: 'Acme CRM', website: 'https://acme.example' };
    const auth: AuthMethod = {
      kind: AuthMethodAPIKey,
      in: AuthMethodAPIKeyInHeader,
      param_name: 'X-API-Key',
    };
    const requirement: CredentialRequirement = {
      slug: 'acme',
      provider,
      auth,
      secrets: ['ACME_API_KEY'],
    };
    expect(requirement.provider?.name).toBe('Acme CRM');
    expect(requirement.auth?.param_name).toBe('X-API-Key');
  });
});

describe('types.ts regen guards (INF-1079)', () => {
  const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('renames auth scheme types to AuthMethod* and company catalog types to Company*', () => {
    expect(source).toMatch(/export interface AuthMethod \{/);
    expect(source).toMatch(/export interface CompanySummary \{/);
    expect(source).toMatch(/export interface CompanySeed \{/);
    expect(source).toMatch(/company\?: CompanySummary;/);
    expect(source).not.toMatch(/export interface AuthSchemeSpec \{/);
    expect(source).not.toMatch(/export interface ProviderSummary \{/);
    expect(source).not.toMatch(/export interface ProviderSeed \{/);
  });
});
