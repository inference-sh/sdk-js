import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as { version: string };

const packageLock = JSON.parse(
  readFileSync(join(__dirname, '../package-lock.json'), 'utf8')
) as { version: string; packages: Record<string, { version?: string }> };

describe('release integrity', () => {
  it('keeps package.json and package-lock.json versions in sync', () => {
    expect(packageLock.version).toBe(packageJson.version);
    expect(packageLock.packages[''].version).toBe(packageJson.version);
  });

  it('keeps SDK_VERSION in sync with package.json', () => {
    expect(SDK_VERSION).toBe(packageJson.version);
  });
});
