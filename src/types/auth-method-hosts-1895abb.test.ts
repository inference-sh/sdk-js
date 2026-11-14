import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  AuthMethodAPIKey,
  AuthMethodAPIKeyInHeader,
  AuthMethodOAuth2,
  SandboxCredentialAuto,
  type AuthMethod,
  type CredentialRequirement,
  type SandboxCredential,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 1895abb: AuthMethod.hosts bind credential secrets to exact
 * egress gateway destinations (api keys and oauth access tokens).
 */
describe('AuthMethod hosts (1895abb)', () => {
  it('allows optional hosts on api_key and oauth2 auth methods', () => {
    const apiKey: AuthMethod = {
      kind: AuthMethodAPIKey,
      in: AuthMethodAPIKeyInHeader,
      param_name: 'Authorization',
      hosts: ['api.anthropic.com', 'db.example.com:5432'],
    };
    expect(apiKey.hosts).toEqual(['api.anthropic.com', 'db.example.com:5432']);

    const oauth: AuthMethod = {
      kind: AuthMethodOAuth2,
      hosts: ['api.github.com'],
    };
    expect(oauth.hosts).toEqual(['api.github.com']);
  });

  it('accepts hosts on CredentialRequirement.auth and SandboxCredential.auth', () => {
    const requirement: CredentialRequirement = {
      slug: 'anthropic',
      secrets: ['ANTHROPIC_API_KEY'],
      auth: {
        kind: AuthMethodAPIKey,
        in: AuthMethodAPIKeyInHeader,
        param_name: 'x-api-key',
        hosts: ['api.anthropic.com'],
      },
    };
    expect(requirement.auth?.hosts).toEqual(['api.anthropic.com']);

    const sandboxCred: SandboxCredential = {
      slug: 'postgres',
      secrets: ['DATABASE_URL'],
      mode: SandboxCredentialAuto,
      auth: {
        kind: AuthMethodAPIKey,
        hosts: ['db.example.com:5432'],
      },
    };
    expect(sandboxCred.auth?.hosts).toEqual(['db.example.com:5432']);
  });

  it('exports AuthMethod kind constants from the main barrel', () => {
    expect(main.AuthMethodAPIKey).toBe('api_key');
    expect(main.AuthMethodOAuth2).toBe('oauth2');
    expect(main.AuthMethodAPIKeyInHeader).toBe('header');
  });

  it('documents hosts, HostBinder, and env fallback semantics in types.ts', () => {
    expect(typesSource).toMatch(/hosts\?: string\[\];/);
    expect(typesSource).toMatch(/Hosts are the hosts the credential's value is sent to/);
    expect(typesSource).toMatch(/authmethod\.HostBinder/);
    expect(typesSource).toMatch(/Empty: the secrets are/);
    expect(typesSource).toMatch(/environment variables, as they were/);
    expect(typesSource).toMatch(/api\.anthropic\.com/);
    expect(typesSource).toMatch(/db\.example\.com:5432/);
    expect(typesSource).toMatch(/auth\?: AuthMethod;/);
  });
});
