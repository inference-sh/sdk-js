import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function readText(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('CI toolchain alignment', () => {
  const expectedNodeMajor = '24';

  it('pins node 24 in .mise.toml so local lockfile generation matches CI', () => {
    const mise = readText('.mise.toml');

    expect(mise).toMatch(/node\s*=\s*["']24["']/);
  });

  it('runs npm ci, test, and build on node 24 in the CI workflow', () => {
    const ci = readText('.github/workflows/ci.yml');

    expect(ci).toMatch(/node-version:\s*24/);
    expect(ci).toContain('npm ci');
    expect(ci).toContain('npm test');
    expect(ci).toContain('npm run build');
  });

  it('uses node 24 and npm ci in the npm publish workflow', () => {
    const publish = readText('.github/workflows/npm-publish.yml');

    expect(publish).toMatch(/node-version:\s*24/);
    expect(publish).toContain('npm ci');
    expect(publish).toContain('npm test');
    expect(publish).toContain('npm run build');
  });

  it('keeps .mise.toml and workflow node versions aligned', () => {
    const mise = readText('.mise.toml');
    const ci = readText('.github/workflows/ci.yml');
    const publish = readText('.github/workflows/npm-publish.yml');

    const miseNode = mise.match(/node\s*=\s*["'](\d+)["']/)?.[1];
    const ciNode = ci.match(/node-version:\s*(\d+)/)?.[1];
    const publishNode = publish.match(/node-version:\s*(\d+)/)?.[1];

    expect(miseNode).toBe(expectedNodeMajor);
    expect(ciNode).toBe(expectedNodeMajor);
    expect(publishNode).toBe(expectedNodeMajor);
    expect(miseNode).toBe(ciNode);
    expect(ciNode).toBe(publishNode);
  });
});
