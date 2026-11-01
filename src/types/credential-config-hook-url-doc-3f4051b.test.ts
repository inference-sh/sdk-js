import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialProviderGitHubApp,
  CredentialScopeTeam,
  type CredentialConfigDTO,
} from '../types.js';

/**
 * types regen 3f4051b / models v0.8.157: HookURL doc no longer distinguishes
 * platform-owned vs workspace-owned GitHub Apps — connect UI should treat
 * hook_url as the single paste target from listAvailable/config payloads.
 */
describe('CredentialConfigDTO HookURL doc (3f4051b)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('documents webhook paste semantics without platform vs workspace app wording', () => {
    expect(typesSource).toMatch(
      /HookURL is where App delivers its events \(the GitHub App's webhook[\s\S]*?URL, to paste in its settings\)\. Empty when the provider's apps[\s\S]*?deliver none\./,
    );
    expect(typesSource).not.toContain("platform's app's, or this workspace's own app's");
  });

  it('still types hook_url as optional on catalog entries', () => {
    expect(typesSource).toMatch(/hook_url\?: string;/);

    const withUrl: CredentialConfigDTO = {
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
      app_noun: 'GitHub App',
      hook_url: 'https://hooks.inference.sh/w/gh-app/team-abc',
    };
    expect(withUrl.hook_url).toBe('https://hooks.inference.sh/w/gh-app/team-abc');

    const withoutUrl: CredentialConfigDTO = {
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
      app_noun: 'GitHub App',
    };
    expect(withoutUrl.hook_url).toBeUndefined();
  });
});
