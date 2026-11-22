import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

/**
 * f50fe12 / AIKIDO-2026-137384: widen the pnpm vite security override so all
 * transitive vite versions below 8.3.7 resolve to ^8.3.7 (was only 8.2.0–8.2.4).
 * Vite arrives dev-only via @sveltejs/kit; reverting the override during lockfile
 * churn would re-open the advisory without failing SDK unit tests.
 */
describe('vite security override floor (f50fe12 / AIKIDO-2026-137384)', () => {
  const workspaceYaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const lockfile = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8');

  it('replaces the narrow 8.2.x vite override with a >=8.0.0 <8.3.7 floor in workspace and lockfile', () => {
    expect(workspaceYaml).toMatch(/'vite@>=8\.0\.0 <8\.3\.7': \^8\.3\.7/);
    expect(workspaceYaml).not.toMatch(/vite@>=8\.2\.0 <8\.2\.4/);
    expect(lockfile).toMatch(
      /overrides:\n[\s\S]*?vite@>=8\.0\.0 <8\.3\.7: \^8\.3\.7/,
    );
    expect(lockfile).not.toMatch(/vite@>=8\.2\.0 <8\.2\.4/);
  });

  it('resolves patched vite on the @sveltejs/kit dev chain', () => {
    expect(lockfile).toMatch(/\n  vite@8\.3\.[789]\d*:/);
    expect(lockfile).not.toMatch(/\n  vite@8\.3\.[0-6](?:\D|$)/);
    expect(lockfile).toMatch(/@sveltejs\/kit@3\.1\.1[\s\S]*?vite@8\.3\.[789]\d*/);
    expect(lockfile).toMatch(
      /@sveltejs\/vite-plugin-svelte@7\.3\.0[\s\S]*?vite@8\.3\.[789]\d*/,
    );
  });
});