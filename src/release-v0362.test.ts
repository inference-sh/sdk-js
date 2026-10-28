import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';
import type { ResolvedUpload } from './api/files.js';

const root = join(__dirname, '..');

function interfaceBlock(source: string, name: string): string {
  const start = source.indexOf(`export interface ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const slice = source.slice(start);
  const end = slice.indexOf('\nexport ');
  return end === -1 ? slice : slice.slice(0, end);
}

/**
 * Release f870698 / changelog 0.36.2 (a87a76d): data URI and bare base64 uploads
 * must send size on POST /files; ResolvedUpload.size is always populated from body.size.
 */
describe('release v0.36.2 (f870698)', () => {
  const filesSource = readFileSync(join(__dirname, 'api/files.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

  it('ships version 0.36.2 with an empty Unreleased section and a dated 0.36.2 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.36.2');
    expect(SDK_VERSION).toBe('0.36.2');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.36\.2\] - 2026-10-28/);
    expect(changelog).toMatch(/Data URI and base64 uploads send `size`/);
    expect(changelog).toMatch(/400 "size is required"/);
    expect(changelog).toMatch(/`ResolvedUpload\.size` is now always set/);
    expect(changelog).toMatch(/## \[0\.36\.1\] - 2026-10-28/);
  });

  it('requires ResolvedUpload.size and wires upload create bodies through resolved.size', () => {
    const block = interfaceBlock(filesSource, 'ResolvedUpload');
    expect(block).toMatch(/size: number;/);
    expect(block).not.toMatch(/size\?: number/);

    expect(filesSource).toMatch(/size:\s*body\.size/);
    expect(filesSource).toMatch(/size:\s*resolved\.size/);

    const resolved: ResolvedUpload = {
      contentType: 'text/plain',
      size: 5,
      body: new Blob(['hello']),
    };
    expect(resolved.size).toBe(5);
  });
});
