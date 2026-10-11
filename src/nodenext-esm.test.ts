import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = join(__dirname, '..');

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      out.push(...walkTsFiles(path));
    } else if (/\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

/** Relative specifiers that plain Node ESM accepts after tsc (copied verbatim). */
const ALLOWED_RELATIVE_SUFFIX = /\.(js|json)(\?.*)?$/;

const RELATIVE_SPECIFIER_RE =
  /(?:\bfrom\s+|import\s*\(\s*|export\s+[^'"]*\s+from\s+)['"](\.\.?\/[^'"]+)['"]/g;

function collectBadRelativeImports(filePath: string, source: string): string[] {
  const bad: string[] = [];
  for (const match of source.matchAll(RELATIVE_SPECIFIER_RE)) {
    const spec = match[1];
    if (!ALLOWED_RELATIVE_SUFFIX.test(spec)) {
      bad.push(spec);
    }
  }
  return bad;
}

/**
 * Commit 25148c6: NodeNext build + .js specifiers so dist loads in plain Node.
 * jest never exercises packed dist/; CI runs scripts/check-exports.mjs after build.
 */
describe('NodeNext ESM build (25148c6)', () => {
  it('uses NodeNext module and resolution in tsconfig (not bundler)', () => {
    const raw = readFileSync(join(root, 'tsconfig.json'), 'utf8');
    expect(raw).toMatch(/"module"\s*:\s*"NodeNext"/);
    expect(raw).toMatch(/"moduleResolution"\s*:\s*"NodeNext"/);
    expect(raw).not.toMatch(/"moduleResolution"\s*:\s*"bundler"/);
  });

  it('maps .js relative imports to TypeScript sources in jest (dev tests stay runnable)', () => {
    const jestConfig = readFileSync(join(root, 'jest.config.cjs'), 'utf8');
    expect(jestConfig).toMatch(/moduleNameMapper.*\\.js\$/);
    expect(jestConfig).toMatch(/tsx/);
  });

  it('keeps every src relative import on a .js or .json specifier', () => {
    const srcRoot = join(root, 'src');
    const violations: string[] = [];
    for (const file of walkTsFiles(srcRoot)) {
      const rel = relative(root, file);
      const source = readFileSync(file, 'utf8');
      for (const spec of collectBadRelativeImports(file, source)) {
        violations.push(`${rel}: ${spec}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it('imports next/server.js in the Next.js proxy adapter (next has no exports map)', () => {
    const nextjs = readFileSync(join(root, 'src/proxy/nextjs.ts'), 'utf8');
    expect(nextjs).toMatch(/from\s+["']next\/server\.js["']/);
    expect(nextjs).not.toMatch(/from\s+["']next\/server["']/);
  });

  it('wires check:exports into package scripts, prepublishOnly, and CI after build', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['check:exports']).toBe('node scripts/check-exports.mjs');
    expect(pkg.scripts.prepublishOnly).toContain('check:exports');
    expect(existsSync(join(root, 'scripts/check-exports.mjs'))).toBe(true);

    const ci = readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).toMatch(/pnpm run check:exports/);
    expect(ci).toMatch(/Build package/);
    const buildIdx = ci.indexOf('pnpm run build');
    const checkIdx = ci.indexOf('check:exports');
    expect(buildIdx).toBeGreaterThan(-1);
    expect(checkIdx).toBeGreaterThan(buildIdx);
  });

  it('documents plain Node loading in the Unreleased changelog', () => {
    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[Unreleased\]/);
    expect(changelog).toMatch(/plain Node/);
    expect(changelog).toMatch(/check:exports/);
  });

  it('loads every packed export in plain Node when dist exists (check:exports)', () => {
    if (!existsSync(join(root, 'dist/index.js'))) {
      return;
    }
    execFileSync('node', ['scripts/check-exports.mjs'], {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
    });
  });
});
