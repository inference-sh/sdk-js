import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as {
  version: string;
  devDependencies?: Record<string, string>;
};

const packageLock = JSON.parse(
  readFileSync(join(__dirname, '../package-lock.json'), 'utf8')
) as { version: string; packages: Record<string, { version?: string }> };

function parseSemver(version: string): [number, number, number] {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid semver: ${version}`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function isAtLeast(version: string, minimum: string): boolean {
  const [major, minor, patch] = parseSemver(version);
  const [minMajor, minMinor, minPatch] = parseSemver(minimum);
  if (major !== minMajor) return major > minMajor;
  if (minor !== minMinor) return minor > minMinor;
  return patch >= minPatch;
}

describe('release integrity', () => {
  it('keeps package.json and package-lock.json versions in sync', () => {
    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages[''].version).toBe(packageJson.version);
  });

  it('keeps SDK_VERSION in sync with package.json', () => {
    expect(SDK_VERSION).toBe(packageJson.version);
  });

  it('pins hono devDependency to >=4.13.1 (CVE-2026 memo/proxy/language fixes)', () => {
    const honoRange = packageJson.devDependencies?.hono;
    expect(honoRange).toBeDefined();

    const minimum = honoRange!.replace(/^[\^~>=<]+/, '');
    expect(isAtLeast(minimum, '4.13.1')).toBe(true);

    const resolved = packageLock.packages['node_modules/hono']?.version;
    expect(resolved).toBeDefined();
    expect(isAtLeast(resolved!, '4.13.1')).toBe(true);
  });
});
