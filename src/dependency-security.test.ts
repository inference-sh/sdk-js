import { readFileSync } from 'fs';
import { join } from 'path';

type PackageJson = {
  overrides?: Record<string, string>;
};

type LockfilePackage = {
  version?: string;
};

type PackageLockJson = {
  packages: Record<string, LockfilePackage>;
};

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as PackageJson;

const lockfile = JSON.parse(
  readFileSync(join(__dirname, '../package-lock.json'), 'utf8')
) as PackageLockJson;

const VULNERABLE_BRACE_EXPANSION_VERSIONS = new Set([
  '1.1.11',
  '1.1.14',
  '1.1.16',
  '2.1.0',
  '5.0.6',
]);

function parseVersion(version: string): [number, number, number] {
  const [major, minor, patch] = version.split('.').map((part) => Number(part));
  return [major, minor, patch];
}

function semverGte(version: string, minimum: string): boolean {
  const [major, minor, patch] = parseVersion(version);
  const [minMajor, minMinor, minPatch] = parseVersion(minimum);

  if (major !== minMajor) return major > minMajor;
  if (minor !== minMinor) return minor > minMinor;
  return patch >= minPatch;
}

function resolvedVersion(packagePath: string): string | undefined {
  return lockfile.packages[packagePath]?.version;
}

describe('dependency security (dependabot alert regressions)', () => {
  it('keeps postcss override pinned for transitive resolution', () => {
    expect(packageJson.overrides?.postcss).toBe('^8.5.10');
  });

  it('resolves postcss to a patched version satisfying the override floor', () => {
    const version = resolvedVersion('node_modules/postcss');
    expect(version).toBeDefined();
    expect(semverGte(version!, '8.5.10')).toBe(true);
  });

  it('resolves next to a patched devDependency version', () => {
    const version = resolvedVersion('node_modules/next');
    expect(version).toBeDefined();
    expect(semverGte(version!, '16.2.12')).toBe(true);
  });

  it('does not resolve brace-expansion to known vulnerable versions', () => {
    const resolved = Object.entries(lockfile.packages)
      .filter(([packagePath]) => packagePath.endsWith('/brace-expansion'))
      .map(([, pkg]) => pkg.version)
      .filter((version): version is string => version !== undefined);

    expect(resolved.length).toBeGreaterThan(0);
    for (const version of resolved) {
      expect(VULNERABLE_BRACE_EXPANSION_VERSIONS.has(version)).toBe(false);
    }
  });
});
