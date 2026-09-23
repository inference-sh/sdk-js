import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as { version: string };

describe('SDK_VERSION (v0.7.0 release)', () => {
  it('matches package.json so X-Client-Source reflects the published SDK version', () => {
    expect(SDK_VERSION).toBe(packageJson.version);
  });
});
