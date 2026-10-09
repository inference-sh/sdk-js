import { INF_TARGET_HEADER, INF_TARGET_PARAM, type ProxyOptions } from './index';
import { createHandler } from './remix';

const API = 'https://api.inference.sh';

function proxied(method: string, target: string, body?: unknown, query = false): Request {
  const url = query
    ? `http://site.test/api/inference/proxy?${INF_TARGET_PARAM}=${encodeURIComponent(target)}`
    : 'http://site.test/api/inference/proxy';
  return new Request(url, {
    method,
    headers: query ? {} : { [INF_TARGET_HEADER]: target, 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function send(options: ProxyOptions<Request>, method: string, path: string, body?: unknown) {
  const res = await createHandler({ apiKey: 'site-key', ...options })({ request: proxied(method, `${API}${path}`, body) });
  return { status: res.status, body: res.status >= 400 ? await res.json() : undefined };
}

describe('proxy policy', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    ) as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  // Account-level and management calls: refused whatever the options say.
  const refused: [string, string, unknown?][] = [
    ['GET', '/secrets'],
    ['GET', '/secrets/reveal/OPENAI_API_KEY'],
    ['POST', '/secrets', { key: 'X', value: 'y' }],
    ['GET', '/apikeys'],
    ['POST', '/apikeys', { name: 'x' }],
    ['DELETE', '/apikeys/k1'],
    ['GET', '/billing'],
    ['GET', '/billing/balance'],
    ['GET', '/me'],
    ['GET', '/me/exports'],
    ['POST', '/me/delete'],
    ['GET', '/teams'],
    ['GET', '/files'],
    ['POST', '/files/list', {}],
    ['GET', '/files/f1'],
    ['DELETE', '/files/f1'],
    ['POST', '/apps', { name: 'x' }],
    ['POST', '/apps/a1', { name: 'x' }],
    ['DELETE', '/apps/a1'],
    ['POST', '/agents', { name: 'x' }],
    ['POST', '/agents/a1', { name: 'x' }],
    ['DELETE', '/agents/a1'],
    ['POST', '/agents/a1/duplicate'],
    ['GET', '/agents/a1/versions'],
    ['GET', '/agents/a1/card'],
    ['GET', '/agents/a1/rules'],
    ['GET', '/admin/users'],
    ['POST', '/admin/teams/t1/plan', {}],
    ['GET', '/tasks'],
    ['POST', '/tasks/list', {}],
    ['DELETE', '/tasks/t1'],
    ['POST', '/tasks/t1/visibility', { visibility: 'public' }],
    ['POST', '/chats/list', {}],
    ['POST', '/chats/c1', { name: 'x' }],
    ['DELETE', '/chats/c1'],
    ['GET', '/chats/c1/trace'],
    ['POST', '/chats/c1/rules', {}],
    ['POST', '/flowruns', {}],
    ['GET', '/apps/run'],
    ['POST', '/apps/run/', { app: 'ana/helper' }],
    ['GET', '/tasks/t1/../../secrets'],
    ['GET', '/tasks/t1%2F..%2F..%2Fsecrets/stream'],
  ];

  it.each([
    ['default options', {}],
    ['every ref allowed and authenticated', { allowedEndpoints: ['*/*'], isAuthenticated: () => true }],
  ] as [string, ProxyOptions<Request>][])('refuses account, management and admin calls with 403 (%s)', async (_n, options) => {
    for (const [method, path, body] of refused) {
      const res = await send(options, method, path, body);
      expect([method, path, res.status]).toEqual([method, path, 403]);
      expect(res.body.error).toMatch(/is not available through the inference\.sh proxy: it forwards app runs and agent chats only$/);
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('refuses the SSE query-param form the same way', async () => {
    const res = await createHandler({ apiKey: 'k' })({ request: proxied('GET', `${API}/secrets`, undefined, true) });
    expect(res.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('lets chat settings change "allow all tools" only', async () => {
    expect((await send({}, 'POST', '/chats/c1/settings', { allow_all_tools: true })).status).toBe(200);
    for (const body of [{ visibility: 'public' }, { disable_hooks: true }, { allow_all_tools: true, Visibility: 'public' }]) {
      const res = await send({}, 'POST', '/chats/c1/settings', body);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/cannot be set through the inference\.sh proxy/);
    }
  });

  describe('allowedEndpoints', () => {
    const only = { allowedEndpoints: ['ana/helper', 'bob/*'] };

    it.each([
      ['POST', '/apps/run', { app: 'ana/helper', input: {} }],
      ['POST', '/apps/run', { app: 'ana/helper@abc123:generate', input: {} }],
      ['POST', '/apps/run', { app: 'ana/helper:generate', input: {} }],
      ['POST', '/apps/run', { app: 'app/ana/helper', input: {} }],
      ['POST', '/apps/run', { app: 'bob/anything@v2', input: {} }],
      ['POST', '/agents/run', { agent: 'ana/helper', input: { text: 'hi' } }],
      ['POST', '/agents/run', { agent: 'ana/helper', chat_id: 'c1', agent_config: null, input: {} }],
      ['POST', '/chats', { agent: 'bob/x' }],
      ['POST', '/chats/c1/agent', { agent: 'ana/helper' }],
      ['GET', '/agents/ana/helper', undefined],
      ['GET', '/agents/ana/helper@v1', undefined],
      // Existing tasks and chats are named by id: forwarded on the read,
      // stream and answer paths.
      ['GET', '/tasks/t1/stream', undefined],
      ['POST', '/chats/c1/messages', { message: 'hi' }],
      ['POST', '/tools/tool1', { result: 'ok' }],
    ])('forwards %s %s naming an allowed app or agent', async (method, path, body) => {
      expect((await send(only, method, path, body)).status).toBe(200);
    });

    it.each([
      ['POST', '/apps/run', { app: 'eve/helper', input: {} }, /app "eve\/helper" is not in this proxy's allowedEndpoints/],
      ['POST', '/apps/run', { app: 'ana/helperx', input: {} }, /not in this proxy's allowedEndpoints/],
      ['POST', '/apps/run', { app: 'bob/a/b', input: {} }, /not in this proxy's allowedEndpoints/],
      ['POST', '/apps/run', { app: '01hzyappid', input: {} }, /not in this proxy's allowedEndpoints/],
      ['POST', '/apps/run', { app: 'ana/', input: {} }, /not in this proxy's allowedEndpoints/],
      ['POST', '/apps/run', { input: {} }, /"app" is required when allowedEndpoints is set/],
      ['POST', '/apps/run', { app: 'ana/helper', app_id: '01hzyappid', input: {} }, /"app_id" is not accepted/],
      ['POST', '/apps/run', { app: 'ana/helper', version_id: 'v', input: {} }, /"version_id" is not accepted/],
      // The API reads JSON keys case-insensitively: "App" is "app".
      ['POST', '/apps/run', { app: 'ana/helper', App: 'eve/x', input: {} }, /not in this proxy's allowedEndpoints/],
      ['POST', '/apps/run', { app: 'ana/helper', APP_ID: 'x', input: {} }, /"app_id" is not accepted/],
      ['POST', '/apps/run', { app: 'ana/helper', verſion_id: 'x', input: {} }, /"version_id" is not accepted/],
      ['POST', '/agents/run', { agent_config: { core_app: { ref: 'ana/helper' } }, input: {} }, /"agent_config" is not accepted/],
      ['POST', '/agents/run', { agent: 'eve/x', chat_id: 'c1', input: {} }, /not in this proxy's allowedEndpoints/],
      ['POST', '/chats', {}, /"agent" is required/],
      ['POST', '/chats', { Agent: 'eve/x' }, /not in this proxy's allowedEndpoints/],
      ['POST', '/chats/c1/agent', { agent: 'eve/x' }, /not in this proxy's allowedEndpoints/],
      ['GET', '/agents/eve/x', undefined, /agent "eve\/x" is not in this proxy's allowedEndpoints/],
    ])('refuses %s %s %j', async (method, path, body, message) => {
      const res = await send(only, method, path, body);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(message);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('answers 400 for a body that is not a JSON object', async () => {
      expect((await send(only, 'POST', '/apps/run', 'not json')).status).toBe(400);
      expect((await send(only, 'POST', '/apps/run', '[]')).status).toBe(400);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each(['*', 'ana', 'ana/helper@v1', 'app/ana/helper', ''])('refuses every request when a pattern is invalid (%j)', async (pattern) => {
      const res = await send({ allowedEndpoints: [pattern] }, 'GET', '/tasks/t1');
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/allowedEndpoints: .* is not a namespace\/name pattern/);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('isAuthenticated and allowUnauthorizedRequests', () => {
    it('refuses with 401 when isAuthenticated answers false, and hands it the framework request', async () => {
      const isAuthenticated = jest.fn().mockResolvedValue(false);
      const res = await send({ isAuthenticated }, 'GET', '/tasks/t1');
      expect(res.status).toBe(401);
      expect(isAuthenticated.mock.calls[0][0]).toBeInstanceOf(Request);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('forwards when isAuthenticated answers true', async () => {
      expect((await send({ isAuthenticated: () => true, allowUnauthorizedRequests: false }, 'GET', '/tasks/t1')).status).toBe(200);
    });

    it('refuses everything with allowUnauthorizedRequests: false and no isAuthenticated', async () => {
      const res = await send({ allowUnauthorizedRequests: false }, 'GET', '/tasks/t1');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/allowUnauthorizedRequests: false without isAuthenticated/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('lets anyone through by default (compatibility)', async () => {
      expect((await send({}, 'GET', '/tasks/t1')).status).toBe(200);
    });
  });
});
