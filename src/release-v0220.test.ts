import { readFileSync } from 'fs';
import { join } from 'path';
import { createHandler } from './proxy/nextjs';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as { version: string };

const changelog = readFileSync(join(__dirname, '../CHANGELOG.md'), 'utf8');

/**
 * Release d9a2ae8 / changelog 826429a: v0.22.0 tightens the server proxy,
 * adds scope/sandbox types, and drops the Next.js PUT handler.
 */
describe('release v0.22.0 (d9a2ae8)', () => {
  it('pins the published package version', () => {
    expect(packageJson.version).toBe('0.22.0');
  });

  it('documents proxy hardening and PATCH update() breaking changes', () => {
    expect(changelog).toMatch(/## \[0\.22\.0\]/);
    expect(changelog).toMatch(/server proxy forwards only app runs and agent chats/);
    expect(changelog).toMatch(/Next\.js proxy handler has no `PUT`/);
    expect(changelog).toMatch(/`update\(\)` on projects, knowledge, skills, chats, engines and teams sends PATCH/);
    expect(changelog).toMatch(/`ScopeRefusedMeta`/);
    expect(changelog).toMatch(/`AppSandbox`/);
  });

  it('createHandler exposes GET and POST only (no PUT)', () => {
    const handlers = createHandler();
    expect(Object.keys(handlers).sort()).toEqual(['GET', 'POST']);
    expect((handlers as Record<string, unknown>).PUT).toBeUndefined();
  });
});
