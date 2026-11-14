import { readFileSync } from 'fs';
import { join } from 'path';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen f638f0b: API default sandbox idle auto-stop is 900s (15 minutes),
 * not the previous 1800s (30 minutes). UIs and CLIs that omit
 * idle_timeout_seconds on create rely on this default.
 */
describe('CreateSandboxRequest idle default (f638f0b)', () => {
  it('documents unset idle_timeout_seconds as 900 (15 minutes) in types.ts', () => {
    expect(typesSource).toMatch(/Unset is 900 \(15 minutes\), 0 never stops it/);
    expect(typesSource).not.toMatch(/Unset is 1800 \(30 minutes\)/);
    expect(typesSource).toMatch(/idle_timeout_seconds\?: number \/\* int \*\//);
    expect(typesSource).toMatch(/60 to\s+\* 2592000 \(30 days\)/);
  });
});
