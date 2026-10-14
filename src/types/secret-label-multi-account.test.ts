import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialScopeOrg,
  CredentialScopeUser,
  type CredentialConfigDTO,
  type SecretCreateRequest,
  type SecretProviderRequest,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * types regen 321f09a: labeled provider secrets and multi-account credential
 * catalog rows.
 */
describe('SecretCreateRequest label (321f09a)', () => {
  it('accepts optional label for named keys beside the default provider secret', () => {
    const req: SecretCreateRequest = {
      key: 'GOOGLE_SA_JSON',
      value: '{"type":"service_account"}',
      provider: 'google',
      label: 'prod',
    };

    expect(req.label).toBe('prod');
  });

  it('omits label when using the owner default key', () => {
    const req: SecretCreateRequest = {
      key: 'API_KEY',
      value: 'sk-live',
    };

    expect(req).not.toHaveProperty('label');
  });
});

describe('SecretProviderRequest label (321f09a)', () => {
  it('accepts optional label when attaching a secret to a provider credential', () => {
    const req: SecretProviderRequest = {
      provider: 'github',
      connection_scope: CredentialScopeUser,
      label: 'personal',
    };

    expect(req.label).toBe('personal');
  });

  it('accepts detach payloads without label', () => {
    const req: SecretProviderRequest = {
      provider: '',
    };

    expect(req.provider).toBe('');
    expect(req).not.toHaveProperty('label');
  });
});

describe('CredentialConfigDTO multi_account (321f09a)', () => {
  const baseConfig = {
    slug: 'google',
    provider: 'google',
    type: 'oauth',
    name: 'Google',
    short_name: 'Google',
    description: 'Google Workspace',
    allows_byok: false,
    available: true,
    has_managed: true,
    connection_scope: CredentialScopeOrg,
  };

  it('marks single-account providers with multi_account false', () => {
    const config: CredentialConfigDTO = {
      ...baseConfig,
      multi_account: false,
    };

    expect(config.multi_account).toBe(false);
    expect(config.accounts).toBeUndefined();
  });

  it('marks multi-account providers and preserves ordered accounts', () => {
    const config: CredentialConfigDTO = {
      ...baseConfig,
      slug: 'github',
      provider: 'github',
      multi_account: true,
      accounts: [
        {
          id: 'cred-work',
          user_id: 'user-1',
          team_id: 'team-1',
          visibility: 'private',
          provider: 'github',
          type: 'oauth',
          grant: 'token',
          scope: CredentialScopeUser,
          status: 'connected',
          display_name: 'Work GitHub',
          scopes: ['repo'],
          is_primary: true,
        },
        {
          id: 'cred-personal',
          user_id: 'user-1',
          team_id: 'team-1',
          visibility: 'private',
          provider: 'github',
          type: 'oauth',
          grant: 'token',
          scope: CredentialScopeUser,
          status: 'connected',
          display_name: 'Personal GitHub',
          scopes: ['read:user'],
          is_primary: false,
        },
      ],
    };

    expect(config.multi_account).toBe(true);
    expect(config.accounts).toHaveLength(2);
    expect(config.accounts?.[0]?.is_primary).toBe(true);
  });
});

describe('types.ts regen guards for secret labels and multi_account (321f09a)', () => {
  it('declares label on SecretCreateRequest after provider_website', () => {
    const block = typesSource.match(/export interface SecretCreateRequest \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/provider_website\?: string;/);
    expect(block![0]).toMatch(/label\?: string;/);
    expect(block![0]).toMatch(/Label names this key among the owner's keys for Provider/);
    expect(block![0]).toMatch(/Empty: the owner's default key/);
  });

  it('declares label on SecretProviderRequest aligned with SecretCreateRequest', () => {
    const block = typesSource.match(/export interface SecretProviderRequest \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/label\?: string;/);
    expect(block![0]).toMatch(/as on\s*\n\s*\* SecretCreateRequest/);
    expect(block![0]).toMatch(/Empty: the owner's default key/);
  });

  it('declares required multi_account on CredentialConfigDTO after accounts', () => {
    const block = typesSource.match(/export interface CredentialConfigDTO \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/accounts\?: \(CredentialDTO \| undefined\)\[\];/);
    expect(block![0]).toMatch(/multi_account: boolean;/);
    expect(block![0]).toMatch(/MultiAccount: several accounts of this provider can be connected side/);
    expect(block![0]).toMatch(/default \(is_primary\) is/);
  });
});
