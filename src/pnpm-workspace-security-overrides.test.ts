import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * pnpm-workspace.yaml overrides from 75be627: dev-only transitive deps
 * (cookie via @sveltejs/kit, brace-expansion via jest's istanbul plugin).
 * The published SDK does not ship them; overrides silence dependabot alerts.
 */
describe('pnpm workspace security overrides (75be627)', () => {
  const source = readFileSync(join(__dirname, '..', 'pnpm-workspace.yaml'), 'utf8');

  it('documents why overrides exist', () => {
    expect(source).toMatch(/Security overrides for dev-only transitive dependencies/);
  });

  it('pins cookie below 0.7.0 to a patched release', () => {
    expect(source).toMatch(/'cookie@<0\.7\.0': \^0\.7\.2/);
  });

  it('pins brace-expansion 2.0.x–2.1.6 to a patched release', () => {
    expect(source).toMatch(/'brace-expansion@>=2\.0\.0 <2\.1\.7': \^2\.1\.7/);
  });
});
