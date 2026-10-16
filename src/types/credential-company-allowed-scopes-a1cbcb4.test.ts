import { readFileSync } from 'fs';
import { join } from 'path';
import type { CompanySummary, CredentialConfigDTO, CredentialDTO } from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

const acmeCompany: CompanySummary = {
  slug: 'acme',
  name: 'Acme Corp',
  website: 'https://acme.example',
};

/**
 * types regen a1cbcb4: CredentialConfigDTO.company is canonical; provider_info
 * mirrors it for legacy belt CLIs. OAuth app rows may expose allowed_scopes.
 */
describe('CredentialConfigDTO company vs provider_info (a1cbcb4)', () => {
  const baseConfig = {
    slug: 'acme-oauth',
    provider: 'acme-oauth',
    type: 'oauth2',
    name: 'Acme OAuth',
    short_name: 'Acme',
    description: 'Acme login',
    allows_byok: true,
    available: true,
    has_managed: false,
    connection_scope: 'team' as const,
    multi_account: false,
  };

  it('prefers company for grouping while accepting provider_info from older clients', () => {
    const config: CredentialConfigDTO = {
      ...baseConfig,
      company: acmeCompany,
      provider_info: acmeCompany,
    };

    expect(config.company?.slug).toBe('acme');
    expect(config.provider_info?.name).toBe('Acme Corp');
  });

  it('allows configs that only send company after INF-1079 rename settled', () => {
    const config: CredentialConfigDTO = {
      ...baseConfig,
      company: acmeCompany,
    };

    expect(config.company?.slug).toBe('acme');
    expect(config.provider_info).toBeUndefined();
  });
});

describe('CredentialDTO allowed_scopes on OAuth app rows (a1cbcb4)', () => {
  it('carries allowed_scopes on grant credentials, not on user logins', () => {
    const appRow: CredentialDTO = {
      id: 'cred-app',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      provider: 'github',
      type: 'oauth',
      grant: 'credentials',
      scope: 'team',
      status: 'connected',
      display_name: 'GitHub app',
      scopes: [],
      is_primary: false,
      allowed_scopes: ['repo', 'read:user'],
    };

    const loginRow: CredentialDTO = {
      id: 'cred-login',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      provider: 'github',
      type: 'oauth',
      grant: 'token',
      app_credential_id: 'cred-app',
      scope: 'user',
      status: 'connected',
      display_name: 'GitHub login',
      scopes: ['repo'],
      is_primary: true,
    };

    expect(appRow.allowed_scopes).toEqual(['repo', 'read:user']);
    expect(loginRow).not.toHaveProperty('allowed_scopes');
  });
});

describe('types.ts regen guards for company and allowed_scopes (a1cbcb4)', () => {
  it('documents company as canonical on CredentialConfigDTO with deprecated provider_info', () => {
    const block = typesSource.match(/export interface CredentialConfigDTO \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/company\?: CompanySummary;/);
    expect(block![0]).toMatch(/The company it belongs to is Company/);
    expect(block![0]).toMatch(/provider_info\?: CompanySummary;/);
    expect(block![0]).toMatch(/ProviderInfo is Company under its pre-INF-1079 name\. Deprecated/);
  });

  it('declares allowed_scopes on CredentialDTO for OAuth app grant rows', () => {
    const block = typesSource.match(
      /export interface CredentialDTO(?: extends [^{]+)? \{[\s\S]*?\n\}/
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/allowed_scopes\?: StringSlice;/);
    expect(block![0]).toMatch(/AllowedScopes, on an OAuth app row/);
    expect(block![0]).toMatch(/Never set on a login/);
  });

  it('documents unapproved_platform_scope deploy warning code', () => {
    const block = typesSource.match(/export interface DeployWarning \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/unapproved_platform_scope/);
  });
});
