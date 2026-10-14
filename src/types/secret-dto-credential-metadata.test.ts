import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SecretScopeInternal,
  SecretScopeTeam,
  type SecretDTO,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * types regen af5d6cf: SecretDTO exposes credential metadata on listings that
 * preload the linked credential (provider slug, display name, label, default flag).
 */
describe('SecretDTO credential metadata on listings (af5d6cf)', () => {
  it('carries provider, provider_name, label, and credential_default for a labeled non-default key', () => {
    const secret: SecretDTO = {
      id: 'sec-1',
      created_at: '2026-10-14T00:00:00Z',
      updated_at: '2026-10-14T00:00:00Z',
      key: 'GOOGLE_SA_JSON',
      masked_value: '****',
      scope: SecretScopeInternal,
      credential_id: 'cred-google-prod',
      provider: 'google',
      provider_name: 'Google',
      label: 'prod',
      credential_default: false,
    };

    expect(secret.provider).toBe('google');
    expect(secret.provider_name).toBe('Google');
    expect(secret.label).toBe('prod');
    expect(secret.credential_default).toBe(false);
  });

  it('marks the owner default key with credential_default true and no label', () => {
    const secret: SecretDTO = {
      id: 'sec-2',
      created_at: '2026-10-14T00:00:00Z',
      updated_at: '2026-10-14T00:00:00Z',
      key: 'GITHUB_TOKEN',
      masked_value: '****',
      scope: SecretScopeInternal,
      credential_id: 'cred-github-default',
      provider: 'github',
      provider_name: 'GitHub',
      credential_default: true,
    };

    expect(secret.label).toBeUndefined();
    expect(secret.credential_default).toBe(true);
  });

  it('keeps plain team secrets without provider metadata but still serialises credential_default', () => {
    const secret: SecretDTO = {
      id: 'sec-3',
      created_at: '2026-10-14T00:00:00Z',
      updated_at: '2026-10-14T00:00:00Z',
      key: 'PLAIN_API_KEY',
      masked_value: '****',
      scope: SecretScopeTeam,
      credential_default: false,
    };

    expect(secret.credential_id).toBeUndefined();
    expect(secret.provider).toBeUndefined();
    expect(secret.provider_name).toBeUndefined();
    expect(secret.label).toBeUndefined();
    expect(secret.credential_default).toBe(false);
  });
});

describe('types.ts regen guards for SecretDTO credential metadata (af5d6cf)', () => {
  it('declares provider metadata and required credential_default on SecretDTO', () => {
    const block = typesSource.match(/export interface SecretDTO extends[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/credential_id\?: string;/);
    expect(block![0]).toMatch(/provider\?: string;/);
    expect(block![0]).toMatch(/provider_name\?: string;/);
    expect(block![0]).toMatch(/label\?: string;/);
    expect(block![0]).toMatch(/credential_default: boolean;/);
    expect(block![0]).toMatch(/Provider is the slug of the credential the secret belongs to/);
    expect(block![0]).toMatch(/CredentialDefault is whether the credential is its owner's default/);
    expect(block![0]).toMatch(/Always serialised: a linked non-default row and an unlabelled row/);
  });
});
