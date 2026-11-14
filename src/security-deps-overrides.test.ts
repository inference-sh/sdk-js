import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

/**
 * Commit 29fc57c: bump next (critical GHSA), and pnpm overrides for vite (high)
 * and body-parser (high) used by @sveltejs/kit and express dev/proxy tests.
 */
describe('security dev dependency pins (29fc57c)', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    devDependencies?: Record<string, string>;
  };
  const workspaceYaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const lockfile = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8');

  it('requests patched next for Next.js proxy dev tests', () => {
    expect(pkg.devDependencies?.next).toBe('^16.4.1');
    expect(lockfile).toMatch(
      /next:\n\s+specifier: \^16\.4\.1\n\s+version: 16\.4\.3\(/,
    );
    expect(lockfile).toMatch(/\n  next@16\.4\.3:/);
  });

  it('keeps pnpm security overrides in workspace and lockfile settings', () => {
    expect(workspaceYaml).toMatch(
      /'vite@>=8\.2\.0 <8\.2\.4': \^8\.2\.4/,
    );
    expect(workspaceYaml).toMatch(
      /'body-parser@>=2\.0\.0 <2\.4\.0': \^2\.4\.0/,
    );
    expect(lockfile).toMatch(
      /overrides:\n[\s\S]*?vite@>=8\.2\.0 <8\.2\.4: \^8\.2\.4/,
    );
    expect(lockfile).toMatch(
      /overrides:\n[\s\S]*?body-parser@>=2\.0\.0 <2\.4\.0: \^2\.4\.0/,
    );
  });

  it('resolves overridden transitive versions in the lockfile', () => {
    expect(lockfile).toMatch(/\n  vite@8\.3\.5:/);
    expect(lockfile).toMatch(/\n  body-parser@2\.4\.0:/);
    expect(lockfile).toMatch(
      /body-parser: 2\.4\.0\(supports-color@8\.1\.1\)/,
    );
    expect(lockfile).toMatch(
      /vite: 8\.3\.5\(@types\/node@26\.4\.1\)/,
    );
  });
});
