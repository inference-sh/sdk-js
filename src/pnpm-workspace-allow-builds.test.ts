import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * pnpm-workspace.yaml allowBuilds from 54b7ce1: sdk-js is its own workspace root
 * (75be627 added this file) and no longer inherits the js monorepo's build-script
 * approvals. Without these entries, strict `pnpm install` fails with
 * ERR_PNPM_IGNORED_BUILDS for @parcel/watcher and unrs-resolver (app image build).
 */
describe('pnpm workspace allowBuilds (54b7ce1)', () => {
  const source = readFileSync(join(__dirname, '..', 'pnpm-workspace.yaml'), 'utf8');

  it('documents why allowBuilds is required for sdk-js', () => {
    expect(source).toMatch(/inherit the js workspace's allowBuilds/);
    expect(source).toMatch(/ERR_PNPM_IGNORED_BUILDS/);
  });

  it('approves @parcel/watcher postinstall (dev transitive)', () => {
    expect(source).toMatch(/"@parcel\/watcher": true/);
  });

  it('approves unrs-resolver postinstall (dev transitive)', () => {
    expect(source).toMatch(/unrs-resolver: true/);
  });
});
