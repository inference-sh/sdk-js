import { readFileSync } from 'fs';
import { join } from 'path';
import manifest from './endpoints.json' with { type: 'json' };
import { PROXY_ENDPOINTS } from './index.js';

/** Agent chat routes that drive remotes; v0.44.0 scopes use remotes:execute (api-v1623). */
const REMOTE_DRIVE_ROUTES = [
  'POST /agents/run',
  'POST /chats/{id}/messages',
  'POST /chats/{id}/stop',
] as const;

function routeKey(method: string, path: string): string {
  return `${method} ${path}`;
}

describe('proxy remotes:execute manifest (v0.44.0)', () => {
  it('documents the scope split in CHANGELOG 0.44.0', () => {
    const changelog = readFileSync(join(__dirname, '../../CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[0\.44\.0\]/);
    expect(changelog).toMatch(/remotes:execute/);
    expect(changelog).toMatch(
      /remote exec, terminal and session routes require `remotes:execute` instead of `remotes:write`/
    );
  });

  it('lists remotes:execute (not remotes:write) on agent remote-drive routes', () => {
    for (const route of REMOTE_DRIVE_ROUTES) {
      const entry = manifest.endpoints.find((e) => routeKey(e.method, e.path) === route);
      expect(entry?.also).toBeDefined();
      expect(entry?.also).toContain('remotes:execute');
      expect(entry?.also).not.toContain('remotes:write');
    }
  });

  it('ships the same also scopes through PROXY_ENDPOINTS', () => {
    for (const route of REMOTE_DRIVE_ROUTES) {
      const entry = PROXY_ENDPOINTS.find((e) => e.route === route);
      expect(entry?.also).toContain('remotes:execute');
      expect(entry?.also).not.toContain('remotes:write');
    }
  });

  it('does not mention remotes:write anywhere in the run-only proxy manifest', () => {
    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain('remotes:write');
    expect(serialized).toContain('remotes:execute');
  });
});