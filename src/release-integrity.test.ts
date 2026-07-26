import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

describe('release integrity', () => {
  it('keeps package.json and package-lock.json versions in sync for npm ci', () => {
    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, 'package.json'), 'utf8')
    ) as { version: string };
    const lockfile = JSON.parse(
      readFileSync(join(repoRoot, 'package-lock.json'), 'utf8')
    ) as { version: string; packages?: Record<string, { version?: string }> };

    expect(lockfile.version).toBe(packageJson.version);
    expect(lockfile.packages?.['']?.version).toBe(packageJson.version);
  });

  it('uses npm version in bump.sh so lockfile stays aligned on release cuts', () => {
    const bumpScript = readFileSync(join(repoRoot, 'scripts/bump.sh'), 'utf8');

    expect(bumpScript).toContain('npm version');
    expect(bumpScript).toContain('package-lock.json');
    expect(bumpScript).not.toMatch(/node -e.*package\.json/);
  });
});
