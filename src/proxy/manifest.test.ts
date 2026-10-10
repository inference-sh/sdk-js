import manifest from './endpoints.json';
import { PROXY_ENDPOINTS, PROXY_ENDPOINT_RULES, PROXY_MANIFEST, matchProxyEndpoint, pickProxyEndpoint } from './index';

// The proxy forwards exactly what go/api's proxy manifest lists
// (internal/models/gen/sdk/proxy_endpoints.json, copied to
// src/proxy/endpoints.json by go/api `make types`): no route of its own,
// none dropped.

const routes = (list: readonly { method: string; path: string }[]) => list.map((e) => `${e.method} ${e.path}`);

/** A concrete request path for a manifest template. */
const sample = (template: string) =>
  template.replace(/\{(\w+)\}/g, (_whole, key: string) => (key === 'namespace' ? 'ns' : key === 'name' ? 'helper' : '0'.repeat(26)));

describe('proxy endpoints come from the API manifest', () => {
  it('ships the manifest the API generated for the run-only preset', () => {
    expect(PROXY_MANIFEST).toBe(manifest);
    expect(manifest.preset).toBe('run-only');
    expect(manifest.endpoints.length).toBeGreaterThan(0);
  });

  it('forwards exactly the manifest routes, in order, with their purpose and scopes', () => {
    expect(PROXY_ENDPOINTS.map((e) => e.route)).toEqual(routes(manifest.endpoints));
    PROXY_ENDPOINTS.forEach((e, i) => {
      expect(e.purpose).toBe(manifest.endpoints[i].purpose);
      expect(e.scopes).toEqual(manifest.endpoints[i].scopes);
    });
  });

  it('has request checks only for manifest routes', () => {
    const known = new Set(routes(manifest.endpoints).map((r) => r.replace(/\{\w+\}/g, '{}')));
    for (const route of Object.keys(PROXY_ENDPOINT_RULES)) {
      expect(known.has(route.replace(/\{\w+\}/g, '{}'))).toBe(true);
    }
  });

  it('matches each manifest path to its own entry, and pickProxyEndpoint finds it by route', () => {
    for (const e of manifest.endpoints) {
      expect(matchProxyEndpoint(e.method, sample(e.path))?.route).toBe(`${e.method} ${e.path}`);
      expect(pickProxyEndpoint(`${e.method} ${e.path}`).route).toBe(`${e.method} ${e.path}`);
    }
  });

  it('checks every route that names an app or agent against allowedEndpoints', () => {
    const named = PROXY_ENDPOINTS.filter((e) => e.ref).map((e) => e.route);
    expect(named).toEqual(['POST /apps/run', 'POST /agents/run', 'POST /chats', 'POST /chats/{id}/agent', 'GET /agents/{namespace}/{name}']);
  });

  it('does not forward a route the manifest leaves out', () => {
    expect(matchProxyEndpoint('POST', `/tools/${'0'.repeat(26)}/approve`)).toBeUndefined();
    expect(matchProxyEndpoint('GET', '/secrets')).toBeUndefined();
    expect(matchProxyEndpoint('GET', `/agents/${'0'.repeat(26)}/versions`)).toBeUndefined();
  });
});
