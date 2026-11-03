import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

/**
 * Commit 18de58f: bump @sveltejs/kit devDep to ^3.1.1 (dependabot on kit);
 * pnpm overrides for qs, glob, and minimatch transitive advisories.
 */
describe('security dev dependency pins (18de58f)', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    devDependencies?: Record<string, string>;
  };
  const workspaceYaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const lockfile = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8');

  it('requests patched @sveltejs/kit for SvelteKit proxy dev tests', () => {
    expect(pkg.devDependencies?.['@sveltejs/kit']).toBe('^3.1.1');
    expect(lockfile).toMatch(
      /'@sveltejs\/kit':\n\s+specifier: \^3\.1\.1\n\s+version: 3\.1\.1\(/,
    );
    expect(lockfile).toMatch(/\n  '@sveltejs\/kit@3\.1\.1\(/);
  });

  it('adds qs, glob, and minimatch overrides in workspace and lockfile settings', () => {
    expect(workspaceYaml).toMatch(/'qs@>=6\.7\.0 <6\.16\.1': \^6\.16\.1/);
    expect(workspaceYaml).toMatch(/'glob@>=9\.0\.0 <14\.0\.2': \^14\.0\.2/);
    expect(workspaceYaml).toMatch(/'minimatch@<11\.0\.1': \^11\.0\.3/);
    expect(lockfile).toMatch(
      /overrides:\n[\s\S]*?qs@>=6\.7\.0 <6\.16\.1: \^6\.16\.1/,
    );
    expect(lockfile).toMatch(
      /overrides:\n[\s\S]*?glob@>=9\.0\.0 <14\.0\.2: \^14\.0\.2/,
    );
    expect(lockfile).toMatch(
      /overrides:\n[\s\S]*?minimatch@<11\.0\.1: \^11\.0\.3/,
    );
  });

  it('resolves overridden transitive versions in the lockfile', () => {
    expect(lockfile).toMatch(/\n  qs@6\.17\.1:/);
    expect(lockfile).toMatch(/\n  glob@14\.0\.3:/);
    expect(lockfile).toMatch(/\n  minimatch@11\.0\.3:/);
  });
});
