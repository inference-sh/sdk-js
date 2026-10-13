import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialGrantToken,
  CredentialScopeTeam,
  CredentialTypeAPIKey,
  type CredentialDTO,
  type CredentialSecretRef,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * types regen 3a647e9: CredentialDTO.secrets links secret rows by id/key
 * (never values); used on vault api_key configs and admin provider trees.
 */
describe('CredentialDTO.secrets (3a647e9)', () => {
  it('models linked secret rows without exposing secret values', () => {
    const refs: CredentialSecretRef[] = [
      {
        id: 'sec-row-1',
        key: 'ACME_API_KEY',
        updated_at: '2026-10-13T10:00:00Z',
      },
      {
        id: 'sec-row-2',
        key: 'ACME_WEBHOOK_SECRET',
        updated_at: '2026-10-13T11:30:00Z',
      },
    ];

    const credential: CredentialDTO = {
      id: 'cred-1',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'team',
      provider: 'acme',
      type: CredentialTypeAPIKey,
      grant: CredentialGrantToken,
      scope: CredentialScopeTeam,
      status: 'connected',
      display_name: 'Acme API key',
      scopes: [],
      is_primary: true,
      secrets: refs,
    };

    expect(credential.secrets).toHaveLength(2);
    expect(credential.secrets?.[0]).toEqual({
      id: 'sec-row-1',
      key: 'ACME_API_KEY',
      updated_at: '2026-10-13T10:00:00Z',
    });
    expect(credential.secrets?.[0]).not.toHaveProperty('value');
    expect(credential.secrets?.[1]?.key).toBe('ACME_WEBHOOK_SECRET');
  });

  it('allows credentials without linked secret rows', () => {
    const credential: CredentialDTO = {
      id: 'cred-oauth',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      provider: 'github',
      type: 'oauth',
      grant: CredentialGrantToken,
      scope: CredentialScopeTeam,
      status: 'connected',
      display_name: 'GitHub',
      scopes: ['repo'],
      is_primary: false,
    };

    expect(credential.secrets).toBeUndefined();
  });
});

describe('types.ts regen guards for CredentialSecretRef (3a647e9)', () => {
  it('documents CredentialDTO as never exposing secret values', () => {
    expect(typesSource).toMatch(
      /CredentialDTO is the API response for a credential \(never exposes secrets\)/
    );
  });

  it('adds optional secrets on CredentialDTO referencing CredentialSecretRef', () => {
    const block = typesSource.match(/export interface CredentialDTO extends[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/secrets\?: CredentialSecretRef\[\]/);
    expect(block![0]).toMatch(/never by value/);
    expect(block![0]).toMatch(/admin provider tree/);
  });

  it('defines CredentialSecretRef with id, key, and updated_at only', () => {
    const block = typesSource.match(/export interface CredentialSecretRef \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/id: string/);
    expect(block![0]).toMatch(/key: string/);
    expect(block![0]).toMatch(/updated_at: string/);
    expect(block![0]).not.toMatch(/value\?:/);
  });
});
