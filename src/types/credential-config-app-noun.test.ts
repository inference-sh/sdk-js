import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialGrantCredentials,
  CredentialGrantToken,
  CredentialProviderGitHub,
  CredentialProviderGitHubApp,
  CredentialScopeTeam,
  type CredentialConfigDTO,
  type CredentialDTO,
} from '../types.js';

/**
 * types regen 00724ff / models v0.8.155: CredentialConfigDTO.app_noun labels
 * non-OAuth-sign-in apps (e.g. GitHub App installations) for connect UI copy.
 */
describe('CredentialConfigDTO app_noun (00724ff)', () => {
  it('accepts app_noun on GitHub App install catalog entries', () => {
    const config: CredentialConfigDTO = {
      slug: 'github-app',
      provider: CredentialProviderGitHubApp,
      type: 'oauth',
      name: 'GitHub App',
      short_name: 'GitHub App',
      description: 'Install a GitHub App on repositories',
      allows_byok: false,
      available: true,
      has_managed: true,
      connection_scope: CredentialScopeTeam,
      app_noun: 'GitHub App',
    };
    expect(config.app_noun).toBe('GitHub App');
    expect(config.provider).toBe('github-app');
  });

  it('allows OAuth sign-in providers to omit app_noun', () => {
    const config: CredentialConfigDTO = {
      slug: 'github',
      provider: CredentialProviderGitHub,
      type: 'oauth',
      name: 'GitHub',
      short_name: 'GitHub',
      description: 'Sign in with GitHub',
      allows_byok: false,
      available: true,
      has_managed: true,
      connection_scope: CredentialScopeTeam,
    };
    expect(config.app_noun).toBeUndefined();
  });

  it('accepts nested app.secrets on workspace-owned app credentials', () => {
    const app: CredentialDTO = {
      id: 'cred-app-gh',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'team',
      provider: CredentialProviderGitHubApp,
      type: 'oauth',
      grant: CredentialGrantCredentials,
      scope: CredentialScopeTeam,
      status: 'connected',
      display_name: 'Workspace GitHub App',
      scopes: [],
      is_primary: false,
      secrets: [{ id: 'sec-1', key: 'private_key', updated_at: '2026-10-31T00:00:00Z' }],
    };
    const config: CredentialConfigDTO = {
      slug: 'github-app',
      provider: CredentialProviderGitHubApp,
      type: 'oauth',
      name: 'GitHub App',
      short_name: 'GitHub App',
      description: 'Install a GitHub App',
      allows_byok: false,
      available: true,
      has_managed: true,
      connection_scope: CredentialScopeTeam,
      app,
      app_noun: 'GitHub App',
      credential: {
        id: 'cred-install',
        user_id: 'user-1',
        team_id: 'team-1',
        visibility: 'team',
        provider: CredentialProviderGitHubApp,
        type: 'oauth',
        grant: CredentialGrantToken,
        app_credential_id: app.id,
        scope: CredentialScopeTeam,
        status: 'connected',
        display_name: 'Org installation',
        scopes: ['installation'],
        is_primary: true,
      },
    };
    expect(config.app?.secrets?.[0]?.key).toBe('private_key');
    expect(config.credential?.grant).toBe(CredentialGrantToken);
  });

  it('documents CredentialDTO.secrets fill paths including config app (v0.8.155)', () => {
    const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(typesSource).toContain('on a config\'s app when it is the caller\'s workspace\'s own');
    expect(typesSource).toContain('AppNoun is what that app is called');
  });
});
