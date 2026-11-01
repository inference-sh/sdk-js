import * as main from '../index.js';
import { CredentialProviderGitHubApp, CredentialProviderGitHub } from '../types.js';

describe('CredentialProviderGitHubApp constant (00724ff)', () => {
  it('exports CredentialProviderGitHubApp for GitHub App installations', () => {
    expect(CredentialProviderGitHubApp).toBe('github-app');
    expect(main.CredentialProviderGitHubApp).toBe('github-app');
  });

  it('keeps github-app distinct from github OAuth provider', () => {
    expect(CredentialProviderGitHubApp).not.toBe(CredentialProviderGitHub);
    expect(CredentialProviderGitHub).toBe('github');
  });
});
