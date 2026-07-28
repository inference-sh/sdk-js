import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function readText(path: string): string {
  return readFileSync(join(repoRoot, path), 'utf8');
}

describe('lockfile toolchain (make relock)', () => {
  it('defines a relock target that regenerates package-lock under the pinned node', () => {
    const makefile = readText('Makefile');

    expect(makefile).toMatch(/^relock:/m);
    expect(makefile).toContain('mise install');
    expect(makefile).toContain('mise exec -- npm install --package-lock-only');
  });

  it('falls back to full npm install when package-lock-only fails', () => {
    const makefile = readText('Makefile');

    expect(makefile).toMatch(
      /mise exec -- npm install --package-lock-only \|\| mise exec -- npm install/
    );
  });

  it('documents the misleading @emnapi/runtime lockfile failure from node mismatch', () => {
    const makefile = readText('Makefile');

    expect(makefile).toContain('@emnapi/runtime');
    expect(makefile).toContain('.mise.toml');
    expect(makefile).toContain('npm-publish.yml');
  });

  it('prints the node version used after regenerating the lockfile', () => {
    const makefile = readText('Makefile');

    expect(makefile).toContain('mise exec -- node -v');
  });

  it('keeps .mise.toml node pin aligned with what relock documents as CI toolchain', () => {
    const mise = readText('.mise.toml');
    const makefile = readText('Makefile');

    const nodePin = mise.match(/node\s*=\s*["'](\d+)["']/)?.[1];
    expect(nodePin).toBeDefined();
    expect(makefile).toContain(`node ${nodePin}`);
  });
});
