import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';
import { pickProxyEndpoint, PROXY_ENDPOINTS } from './proxy/index.js';

const root = join(__dirname, '..');

function interfaceBlock(source: string, name: string): string {
  const start = source.indexOf(`export interface ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const slice = source.slice(start);
  const end = slice.indexOf('\nexport ');
  return end === -1 ? slice : slice.slice(0, end);
}

/**
 * Release 9e36ddd / changelog 0.36.1: proxy manifest and PROXY_ENDPOINTS carry
 * optional `also` scopes (partial capability checks on the API side).
 */
describe('release v0.36.1 (9e36ddd)', () => {
  const proxySource = readFileSync(join(__dirname, 'proxy/index.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

  it('ships version 0.36.1 with an empty Unreleased section and a dated 0.36.1 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.36.1');
    expect(SDK_VERSION).toBe('0.36.1');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.36\.1\] - 2026-10-28/);
    expect(changelog).toMatch(/`ProxyEndpoint\.also`/);
    expect(changelog).toMatch(/`ProxyManifestEndpoint\.also`/);
    expect(changelog).toMatch(/filing a chat in a project takes `projects:read`/);
    expect(changelog).toMatch(/## \[0\.36\.0\] - 2026-10-28/);
  });

  it('documents also on manifest and runtime proxy endpoint types', () => {
    const manifestBlock = interfaceBlock(proxySource, 'ProxyManifestEndpoint');
    expect(manifestBlock).toMatch(/also\?: string\[\]/);
    expect(manifestBlock).toMatch(/filing a chat in a project takes projects:read/);

    const endpointBlock = interfaceBlock(proxySource, 'ProxyEndpoint');
    expect(endpointBlock).toMatch(/also: readonly string\[\]/);
    expect(endpointBlock).toMatch(/Scopes it asks for in part of what it does/);
  });

  it('maps manifest also scopes onto PROXY_ENDPOINTS and defaults missing also to []', () => {
    const byRoute = new Map(PROXY_ENDPOINTS.map((e) => [e.route, e]));

    expect(byRoute.get('POST /files')?.also).toEqual([]);
    expect(byRoute.get('GET /chats/{id}')?.also).toEqual([]);

    expect(byRoute.get('POST /chats')?.also).toEqual(
      expect.arrayContaining(['projects:read', 'agents:read', 'conversations:read'])
    );
    expect(byRoute.get('POST /agents/run')?.also).toContain('projects:read');
    expect(byRoute.get('POST /chats/{id}/messages')?.also).toContain('projects:read');

    expect(pickProxyEndpoint('POST /chats').also).toContain('projects:read');
    expect(pickProxyEndpoint('POST /tasks/{id}/cancel').also).toEqual(['engines:write']);
  });
});
