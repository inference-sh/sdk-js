#!/usr/bin/env node
// Loads every package.json export of the packed tarball in plain Node, the way
// a consumer without a bundler does: ESM import() and CJS require().
//
// jest runs the .ts source through ts-jest, so it never sees what Node does
// with dist/. 0.22.1 shipped extensionless relative imports and
// `import "@inferencesh/sdk"` failed with ERR_MODULE_NOT_FOUND.
//
// Run after `pnpm run build`. The tarball is unpacked under node_modules/.cache
// so dependencies and the optional peers the proxy adapters load at runtime
// (next) resolve from this repo's node_modules, without a network install.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const work = join(root, 'node_modules', '.cache', 'pack-check');
const installed = join(work, 'node_modules', pkg.name);

rmSync(work, { recursive: true, force: true });
mkdirSync(installed, { recursive: true });

const packed = JSON.parse(
  execFileSync('pnpm', ['pack', '--json', '--pack-destination', work], {
    cwd: root,
    encoding: 'utf8',
  })
);
execFileSync('tar', ['-xzf', packed.filename, '-C', installed, '--strip-components=1']);

// Runs in a child so each entry point loads in a fresh module graph.
const probe = `
const spec = process.argv[1];
const esm = await import(spec);
const cjs = (await import('node:module')).createRequire(process.cwd() + '/')(spec);
const names = Object.keys(esm).filter((k) => k !== 'default');
if (names.length === 0) throw new Error('no named exports');
if (Object.keys(cjs).length === 0) throw new Error('require() returned no exports');
console.log(names.length);
`;

let failed = 0;
for (const [subpath, conditions] of Object.entries(pkg.exports)) {
  const spec = pkg.name + subpath.slice(1);
  const missing = [conditions.types, conditions.default].filter(
    (f) => !existsSync(join(installed, f))
  );
  try {
    if (missing.length) throw new Error(`not in tarball: ${missing.join(', ')}`);
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', probe, spec], {
      cwd: work,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    console.log(`ok    ${spec} (${out.trim()} exports)`);
  } catch (err) {
    failed++;
    const detail = (err.stderr || err.message)
      .split('\n')
      .find((l) => /Error|not in tarball/.test(l));
    console.error(`FAIL  ${spec}: ${detail ?? err.message}`);
  }
}

rmSync(work, { recursive: true, force: true });
if (failed) {
  console.error(`\n${failed} export(s) do not load in plain Node.`);
  process.exit(1);
}
