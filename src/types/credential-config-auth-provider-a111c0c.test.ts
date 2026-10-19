import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialScopeTeam,
  type CompanySummary,
  type CredentialConfigDTO,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * INF-1079 step 3b (a111c0c): CredentialConfigDTO uses auth_provider_id
 * (was auth_scheme_id) and drops deprecated provider_info in favor of company.
 */
describe('CredentialConfigDTO auth provider id (a111c0c)', () => {
  it('accepts company and auth_provider_id on merged catalog views', () => {
    const company: CompanySummary = {
      slug: 'github',
      name: 'GitHub',
      website: 'https://github.com',
    };

    const config: CredentialConfigDTO = {
      slug: 'github',
      provider: 'github',
      company,
      type: 'oauth',
      name: 'GitHub',
      short_name: 'GitHub',
      description: 'GitHub OAuth',
      allows_byok: false,
      available: true,
      has_managed: true,
      connection_scope: CredentialScopeTeam,
      multi_account: true,
      auth_provider_id: 'aprov_team_github',
    };

    expect(config.company).toEqual(company);
    expect(config.auth_provider_id).toBe('aprov_team_github');
  });
});

describe('types.ts regen guards for CredentialConfigDTO (a111c0c)', () => {
  it('declares auth_provider_id and company without legacy provider_info or auth_scheme_id', () => {
    const block = typesSource.match(
      /export interface CredentialConfigDTO(?: extends [^{]+)? \{[\s\S]*?\n\}/
    );
    expect(block).not.toBeNull();
    const body = block![0];

    expect(body).toMatch(/company\?: CompanySummary;/);
    expect(body).toMatch(/auth_provider_id\?: string;/);
    expect(body).toMatch(/AuthProviderID is set when the provider is one the team defined/);
    expect(body).not.toMatch(/provider_info\?:/);
    expect(body).not.toMatch(/auth_scheme_id\?:/);
  });
});
