import manifest from './endpoints.json' with { type: 'json' };
import { PROXY_ENDPOINTS, matchProxyEndpoint } from './index.js';

const TASK = '01j9z3m8k2c9v7b4n6q5r0t1wx';
const CHAT = '01j9z3m8k2c9v7b4n6q5r0c4at';

type ManifestEndpoint = (typeof manifest.endpoints)[number] & { also?: string[] };

/**
 * Manifest regen 1ec3213: stop/cancel paths that touch a sandbox engine ask for
 * engine_self (the run's engine) instead of broad engines:write on site keys.
 */
describe('proxy engine_self also scopes (1ec3213 / engine identity)', () => {
  const manifestText = JSON.stringify(manifest);

  it('drops engines:write from the run-only proxy manifest', () => {
    expect(manifestText).not.toContain('engines:write');
  });

  it('POST /tasks/{id}/cancel also lists engine_self only', () => {
    const route = 'POST /tasks/{id}/cancel';
    const built = PROXY_ENDPOINTS.find((e) => e.route === route);
    const raw = manifest.endpoints.find((e) => e.method === 'POST' && e.path === '/tasks/{id}/cancel') as
      | ManifestEndpoint
      | undefined;

    expect(built?.also).toEqual(['engine_self']);
    expect(raw?.also).toEqual(['engine_self']);
    expect(matchProxyEndpoint('POST', `/tasks/${TASK}/cancel`)?.also).toEqual(['engine_self']);
  });

  it('POST /chats/{id}/stop also lists engine_self and not engines:write', () => {
    const route = 'POST /chats/{id}/stop';
    const built = PROXY_ENDPOINTS.find((e) => e.route === route);
    const raw = manifest.endpoints.find((e) => e.method === 'POST' && e.path === '/chats/{id}/stop') as
      | ManifestEndpoint
      | undefined;

    expect(built?.also).toContain('engine_self');
    expect(built?.also).not.toContain('engines:write');
    expect(raw?.also).toContain('engine_self');
    expect(raw?.also).not.toContain('engines:write');
    expect(matchProxyEndpoint('POST', `/chats/${CHAT}/stop`)?.also).toContain('engine_self');
  });
});
