import * as main from '../index.js';
import {
  CredentialProvider,
  CredentialProviderGitHub,
  CredentialProviderGitHubApp,
  CredentialGrantToken,
  type CredentialDTO,
} from '../types.js';

/**
 * types regen 7fb28ac / models v0.8.154: GitHub App installations use provider
 * slug `github-app`, distinct from user OAuth `github`.
 */
describe('CredentialProvider github-app (7fb28ac)', () => {
  it('exports CredentialProviderGitHubApp on types and the main barrel', () => {
    expect(CredentialProviderGitHubApp).toBe('github-app');
    expect(main.CredentialProviderGitHubApp).toBe('github-app');
  });

  it('keeps github-app distinct from github OAuth in the provider union', () => {
    const oauth: CredentialProvider = CredentialProviderGitHub;
    const appInstall: CredentialProvider = CredentialProviderGitHubApp;
    expect(oauth).toBe('github');
    expect(appInstall).toBe('github-app');
    expect(oauth).not.toBe(appInstall);
  });

  it('accepts github-app on CredentialDTO.provider for API payloads', () => {
    const dto: CredentialDTO = {
      id: 'cred-gh-app-1',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      provider: CredentialProviderGitHubApp,
      type: 'oauth',
      grant: CredentialGrantToken,
      scope: 'team',
      status: 'connected',
      display_name: 'My GitHub App',
      scopes: ['installation'],
      is_primary: false,
    };
    expect(dto.provider).toBe('github-app');
  });
});
