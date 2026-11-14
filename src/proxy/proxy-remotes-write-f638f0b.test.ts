import manifest from './endpoints.json' with { type: 'json' };
import { PROXY_ENDPOINTS, matchProxyEndpoint } from './index.js';

const CHAT = '01j9z3m8k2c9v7b4n6q5r0c4at';

type ManifestEndpoint = (typeof manifest.endpoints)[number] & { also?: string[] };

function manifestAlso(method: string, path: string): string[] | undefined {
  return (manifest.endpoints.find((e) => e.method === method && e.path === path) as ManifestEndpoint | undefined)?.also;
}

/**
 * Manifest regen f638f0b (api#2286): agent run and chat message paths that
 * may touch remote sandboxes list remotes:write beside remotes:read in `also`,
 * so site-proxy keys document the scopes integrators must grant.
 */
describe('proxy remotes:write also scopes (f638f0b / api#2286)', () => {
  const agentRemoteRoutes = ['POST /agents/run', 'POST /chats/{id}/messages'] as const;

  it.each(agentRemoteRoutes)('%s also lists remotes:write after remotes:read', (route) => {
    const built = PROXY_ENDPOINTS.find((e) => e.route === route);
    const [, pathTemplate] = route.split(' ');
    const [method] = route.split(' ');
    const rawAlso = manifestAlso(method, pathTemplate);

    expect(built?.also).toContain('remotes:read');
    expect(built?.also).toContain('remotes:write');
    expect(rawAlso).toContain('remotes:write');
    expect(built?.also).toEqual(rawAlso);

    const readAt = built!.also.indexOf('remotes:read');
    const writeAt = built!.also.indexOf('remotes:write');
    expect(readAt).toBeGreaterThanOrEqual(0);
    expect(writeAt).toBeGreaterThan(readAt);
  });

  it('matchProxyEndpoint surfaces remotes:write on live chat message paths', () => {
    expect(matchProxyEndpoint('POST', `/chats/${CHAT}/messages`)?.also).toContain('remotes:write');
  });

  it('only agent-facing POST routes that already carried remotes:read gained remotes:write', () => {
    const withWrite = PROXY_ENDPOINTS.filter((e) => e.also.includes('remotes:write')).map((e) => e.route).sort();
    expect(withWrite).toEqual([
      'POST /agents/run',
      'POST /chats/{id}/messages',
      'POST /chats/{id}/stop',
    ]);
  });
});
