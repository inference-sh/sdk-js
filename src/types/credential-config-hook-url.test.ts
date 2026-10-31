import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialGrantCredentials,
  CredentialProviderGitHub,
  CredentialProviderGitHubApp,
  CredentialScopeTeam,
  type CredentialConfigDTO,
} from '../types.js';

/**
 * types regen 5e54d38 / models v0.8.156: CredentialConfigDTO.hook_url tells
 * connect UI where to paste a GitHub App webhook URL (platform vs workspace app).
 */
describe('CredentialConfigDTO hook_url (5e54d38)', () => {
  it('accepts hook_url on GitHub App install catalog entries', () => {
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
      hook_url: 'https://api.inference.sh/hooks/github-app/team-abc',
    };
    expect(config.hook_url).toBe('https://api.inference.sh/hooks/github-app/team-abc');
    expect(config.provider).toBe('github-app');
  });

  it('allows OAuth sign-in providers to omit hook_url', () => {
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
    expect(config.hook_url).toBeUndefined();
  });

  it('allows providers that deliver no app events to omit hook_url', () => {
    const config: CredentialConfigDTO = {
      slug: 'google-sa',
      provider: 'google-sa',
      type: 'service_account',
      name: 'Google Service Account',
      short_name: 'Google SA',
      description: 'Connect a service account key',
      allows_byok: true,
      available: true,
      has_managed: false,
      connection_scope: CredentialScopeTeam,
    };
    expect(config.hook_url).toBeUndefined();
  });

  it('accepts workspace-owned app webhook URLs alongside nested app config', () => {
    const config: CredentialConfigDTO = {
      slug: 'github-app',
      provider: CredentialProviderGitHubApp,
      type: 'oauth',
      name: 'GitHub App',
      short_name: 'GitHub App',
      description: 'Install your workspace GitHub App',
      allows_byok: false,
      available: true,
      has_managed: true,
      connection_scope: CredentialScopeTeam,
      app_noun: 'GitHub App',
      hook_url: 'https://hooks.example.com/workspace/gh-app',
      app: {
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
      },
    };
    expect(config.hook_url).toContain('hooks.example.com');
    expect(config.app?.display_name).toBe('Workspace GitHub App');
  });

  it('documents HookURL delivery semantics on CredentialConfigDTO (v0.8.156)', () => {
    const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(typesSource).toContain('HookURL is where App delivers its events');
    expect(typesSource).toContain('Empty when the provider\'s apps deliver none');
  });
});
