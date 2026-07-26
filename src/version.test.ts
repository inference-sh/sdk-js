import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SDK_VERSION } from './version';

describe('SDK_VERSION', () => {
  it('matches package.json so X-Client-Source reports the published SDK version', () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8')
    ) as { version: string };

    expect(SDK_VERSION).toBe(pkg.version);
    expect(SDK_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
