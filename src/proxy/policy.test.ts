import {
  INF_TARGET_HEADER,
  INF_TARGET_PARAM,
  PROXY_ENDPOINTS,
  matchProxyEndpoint,
  pickProxyEndpoint,
  type ProxyOptions,
} from './index';
import { createHandler } from './remix';

const API = 'https://api.inference.sh';

// Ids as the API mints them: lowercase 26-character ULIDs.
const TASK = '01j9z3m8k2c9v7b4n6q5r0t1wx';
const CHAT = '01j9z3m8k2c9v7b4n6q5r0c4at';
const MSG = '01j9z3m8k2c9v7b4n6q5r0m5g0';
const TOOL = '01j9z3m8k2c9v7b4n6q5r0t001';
const RUN = '01j9z3m8k2c9v7b4n6q5r0r0n1';
const INTERRUPT = '01j9z3m8k2c9v7b4n6q5r0n7r1';

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
    ['DELETE', `/tasks/${TASK}`],
    ['POST', `/tasks/${TASK}/visibility`, { visibility: 'public' }],
    ['POST', '/chats/list', {}],
    ['POST', `/chats/${CHAT}`, { name: 'x' }],
    ['DELETE', `/chats/${CHAT}`],
    ['GET', `/chats/${CHAT}/trace`],
    ['POST', `/chats/${CHAT}/rules`, {}],
    ['POST', '/flowruns', {}],
    ['GET', '/apps/run'],
    ['POST', '/apps/run/', { app: 'ana/helper' }],
    ['GET', `/tasks/${TASK}/../../secrets`],
    ['GET', `/tasks/${TASK}%2F..%2F..%2Fsecrets/stream`],
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

  // Every API route under these prefixes with a literal segment where the
  // proxy takes an id (copied from the API's routes.go). An id pattern that
  // matched "stream" once let GET /tasks/stream, the live feed of every task
  // the key can read, through.
  const literalSiblings: [string, string][] = [
    ['GET', '/tasks/stream'],
    ['GET', '/tasks/featured'],
    ['GET', '/tasks/queue-stats'],
    ['POST', '/tasks/list'],
    ['POST', '/tasks/run'],
    ['GET', '/tasks/list'],
    ['GET', '/tasks/run'],
    ['GET', '/tasks/stream/stream'],
    ['GET', '/tasks/featured/status'],
    ['POST', '/tasks/list/cancel'],
    ['POST', '/chats/list'],
    ['GET', '/chats/list'],
    ['GET', '/chats/stream'],
    ['GET', '/chats/messages'],
    ['GET', '/chats/list/stream'],
    ['GET', '/chats/list/messages'],
    ['GET', '/chats/list/status'],
    ['POST', '/chats/list/messages'],
    ['POST', '/chats/list/stop'],
    ['POST', '/chats/list/agent'],
    ['POST', '/chats/messages/list/cancel'],
    ['GET', '/chats/messages/stream'],
    ['POST', '/tools/widget'],
    ['GET', '/agent-runs/list'],
    ['POST', '/agent-runs/list'],
  ];

  it.each([
    ['default options', {}],
    ['every ref allowed and authenticated', { allowedEndpoints: ['*/*'], isAuthenticated: () => true }],
  ] as [string, ProxyOptions<Request>][])('never takes a literal route segment for an id (%s)', async (_n, options) => {
    for (const [method, path] of literalSiblings) {
      const res = await send(options, method, path, method === 'POST' ? {} : undefined);
      expect([method, path, res.status]).toEqual([method, path, 403]);
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('takes only the API id shape where a path names a task or chat', async () => {
    for (const id of [
      'stream', 't1', TASK.toUpperCase(), TASK.slice(1), `${TASK}0`, 'abcdefghijklmnopqrstuvwxyz', `${TASK.slice(0, 25)}_`,
    ]) {
      expect([id, (await send({}, 'GET', `/tasks/${id}`)).status]).toEqual([id, 403]);
      expect([id, (await send({}, 'GET', `/chats/${id}/stream`)).status]).toEqual([id, 403]);
    }
    expect((await send({}, 'GET', `/tasks/${TASK}`)).status).toBe(200);
  });

  // The API takes approvals only from the account holder's own sign-in, and
  // the proxy signs with a key: these are not forwarded, and neither is the
  // chat setting that would approve every call instead.
  it.each([
    ['POST', `/tools/${TOOL}/invoke`, undefined],
    ['POST', `/tools/${TOOL}/reject`, { reason: 'no' }],
    ['GET', `/chats/${CHAT}/tools/${TOOL}/always-allow/options`, undefined],
    ['POST', `/chats/${CHAT}/tools/${TOOL}/always-allow`, {}],
    ['POST', `/chats/${CHAT}/tools/${TOOL}/explain`, {}],
    ['POST', `/interrupts/${INTERRUPT}/resolve`, { resolution: 'allow' }],
    ['GET', `/agent-runs/${RUN}/interrupts`, undefined],
    ['POST', `/chats/${CHAT}/settings`, { allow_all_tools: true }],
    ['POST', `/chats/${CHAT}/settings`, { disable_hooks: true }],
  ])('refuses approvals and chat settings: %s %s', async (method, path, body) => {
    const res = await send({ allowedEndpoints: ['*/*'], isAuthenticated: () => true }, method, path, body);
    expect(res.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  describe('POST /apps/run', () => {
    it('forwards the app, its input and how to follow the run', async () => {
      const body = { app: 'ana/helper@v1', function: 'generate', input: { prompt: 'x' }, stream: true, wait: false };
      expect((await send({}, 'POST', '/apps/run', body)).status).toBe(200);
      expect((await send({}, 'POST', '/apps/run', { app_id: 'a', version_id: 'v', input: {} })).status).toBe(200);
    });

    it.each([
      ['workers', ['private-worker']],
      ['infra', 'private'],
      ['session', 'sess-of-another-visitor'],
      ['session_timeout', 600],
      ['webhook', 'https://evil.example/hook'],
      ['run_at', '2030-01-01T00:00:00Z'],
      ['setup', { model: 'big' }],
      ['metadata', { x: 1 }],
      ['Workers', ['private-worker']],
      ['WEBHOOK', 'https://evil.example/hook'],
      ['ſession', 'x'],
    ])('refuses a visitor-set %s', async (field, value) => {
      for (const options of [{}, { allowedEndpoints: ['ana/*'] }]) {
        const res = await send(options, 'POST', '/apps/run', { app: 'ana/helper', input: {}, [field]: value });
        expect(res.status).toBe(403);
        expect(res.body.error).toBe(`"${field}" cannot be set through the inference.sh proxy`);
      }
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('POST /files', () => {
    const file = (extra: Record<string, unknown> = {}) => ({ uri: '', filename: 'a.png', content_type: 'image/png', size: 1024, ...extra });

    it('forwards one file within the size limit', async () => {
      expect((await send({}, 'POST', '/files', { files: [file()] })).status).toBe(200);
      expect((await send({}, 'POST', '/files', { files: [file({ size: 100 * 1024 * 1024 })] })).status).toBe(200);
      expect((await send({ maxUploadBytes: 2048 }, 'POST', '/files', { files: [file({ size: 2048 })] })).status).toBe(200);
    });

    it.each([
      ['over the default 100 MiB', {}, { files: [file({ size: 100 * 1024 * 1024 + 1 })] }, 413],
      ['over maxUploadBytes', { maxUploadBytes: 2048 }, { files: [file({ size: 2049 })] }, 413],
      ['over the limit under a folded key', { maxUploadBytes: 2048 }, { files: [file({ SIZE: 1e9 })] }, 413],
      ['two files', {}, { files: [file(), file()] }, 403],
      ['no files', {}, { files: [] }, 403],
      ['a second files array under a folded key', {}, { files: [file()], FILES: [file(), file()] }, 403],
      ['a category', {}, { files: [file()], category: 'artifacts' }, 403],
      ['an unknown file field', {}, { files: [file({ store: 'x' })] }, 403],
      ['no size', {}, { files: [{ filename: 'a.png' }] }, 400],
      ['a fractional size', {}, { files: [file({ size: 1.5 })] }, 400],
      ['a string size', {}, { files: [file({ size: '1024' })] }, 400],
    ] as [string, ProxyOptions<Request>, unknown, number][])('refuses %s', async (_n, options, body, status) => {
      expect((await send(options, 'POST', '/files', body)).status).toBe(status);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('answers 500 on every request for an invalid maxUploadBytes', async () => {
      expect((await send({ maxUploadBytes: 0 }, 'GET', `/tasks/${TASK}`)).status).toBe(500);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('refuses the SSE query-param form the same way', async () => {
    const res = await createHandler({ apiKey: 'k' })({ request: proxied('GET', `${API}/secrets`, undefined, true) });
    expect(res.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
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
      ['POST', '/agents/run', { agent: 'ana/helper', chat_id: CHAT, agent_config: null, input: {} }],
      ['POST', '/chats', { agent: 'bob/x' }],
      ['POST', `/chats/${CHAT}/agent`, { agent: 'ana/helper' }],
      ['GET', '/agents/ana/helper', undefined],
      ['GET', '/agents/ana/helper@v1', undefined],
      // Existing tasks and chats are named by id: whoever holds the id may
      // use every id call on it, whatever its app or agent.
      ['GET', `/tasks/${TASK}/stream`, undefined],
      ['POST', `/tasks/${TASK}/cancel`, undefined],
      ['POST', `/chats/${CHAT}/messages`, { message: 'hi' }],
      ['POST', `/chats/${CHAT}/stop`, undefined],
      ['POST', `/chats/messages/${MSG}/cancel`, undefined],
      ['POST', `/tools/${TOOL}`, { result: 'ok' }],
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
      ['POST', '/agents/run', { agent: 'eve/x', chat_id: CHAT, input: {} }, /not in this proxy's allowedEndpoints/],
      ['POST', '/chats', {}, /"agent" is required/],
      ['POST', '/chats', { Agent: 'eve/x' }, /not in this proxy's allowedEndpoints/],
      ['POST', `/chats/${CHAT}/agent`, { agent: 'eve/x' }, /not in this proxy's allowedEndpoints/],
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
      const res = await send({ allowedEndpoints: [pattern] }, 'GET', `/tasks/${TASK}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/allowedEndpoints: .* is not a namespace\/name pattern/);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('isAuthenticated and allowUnauthorizedRequests', () => {
    it('refuses with 401 when isAuthenticated answers false, and hands it the framework request', async () => {
      const isAuthenticated = jest.fn().mockResolvedValue(false);
      const res = await send({ isAuthenticated }, 'GET', `/tasks/${TASK}`);
      expect(res.status).toBe(401);
      expect(isAuthenticated.mock.calls[0][0]).toBeInstanceOf(Request);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('forwards when isAuthenticated answers true', async () => {
      expect((await send({ isAuthenticated: () => true, allowUnauthorizedRequests: false }, 'GET', `/tasks/${TASK}`)).status).toBe(200);
    });

    it('refuses everything with allowUnauthorizedRequests: false and no isAuthenticated', async () => {
      const res = await send({ allowUnauthorizedRequests: false }, 'GET', `/tasks/${TASK}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/allowUnauthorizedRequests: false without isAuthenticated/);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('lets anyone through by default (compatibility)', async () => {
      expect((await send({}, 'GET', `/tasks/${TASK}`)).status).toBe(200);
    });
  });
});

describe('proxy subsets: endpoints, pickProxyEndpoint, exactRefs', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    ) as typeof fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('matchProxyEndpoint finds the entry a request takes', () => {
    expect(matchProxyEndpoint('post', `/chats/${CHAT}/messages`)?.purpose).toBe('send a message in a chat');
    expect(matchProxyEndpoint('GET', '/tasks/stream')).toBeUndefined();
  });

  it('pickProxyEndpoint takes route templates and refuses routes the proxy does not forward', () => {
    expect(pickProxyEndpoint('GET /chats/{id}/stream').path.test(`/chats/${CHAT}/stream`)).toBe(true);
    expect(pickProxyEndpoint('GET /agents/{namespace}/{name}').ref).toEqual({ path: true });
    expect(() => pickProxyEndpoint('GET /secrets')).toThrow(/not in PROXY_ENDPOINTS/);
    expect(() => pickProxyEndpoint('PUT /chats')).toThrow(/not in PROXY_ENDPOINTS/);
    expect(() => pickProxyEndpoint('POST /apps/run', { onlyFields: ['app', 'webhook'] })).toThrow(/does not take "webhook"/);
  });

  it('forwards only the endpoints given', async () => {
    const options = { endpoints: [pickProxyEndpoint('GET /chats/{id}')] };
    expect((await send(options, 'GET', `/chats/${CHAT}`)).status).toBe(200);
    expect((await send(options, 'GET', `/tasks/${TASK}`)).status).toBe(403);
    expect((await send(options, 'POST', '/apps/run', { app: 'ana/x' })).status).toBe(403);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('narrows an endpoint with onlyFields and validate, after its own checks', async () => {
    const validate = jest.fn((body: Record<string, unknown>) =>
      typeof body.message === 'string' ? undefined : { status: 400, error: 'message must be a string' });
    const options = { endpoints: [pickProxyEndpoint('POST /chats/{id}/messages', { onlyFields: ['message'], validate })] };
    expect((await send(options, 'POST', `/chats/${CHAT}/messages`, { message: 'hi' })).status).toBe(200);
    expect((await send(options, 'POST', `/chats/${CHAT}/messages`, { message: 1 })).status).toBe(400);
    expect((await send(options, 'POST', `/chats/${CHAT}/messages`, { message: 'hi', input: {} })).status).toBe(403);
    // The base entry's own check still runs first.
    const upload = { endpoints: [pickProxyEndpoint('POST /files', { validate: () => undefined })] };
    expect((await send(upload, 'POST', '/files', { files: [{ size: 1 }, { size: 1 }] })).status).toBe(403);
  });

  it('refuses every request when an endpoint did not come from PROXY_ENDPOINTS', async () => {
    const forged = { ...PROXY_ENDPOINTS[0], path: /^\/secrets$/ };
    const res = await send({ endpoints: [forged] }, 'GET', `/tasks/${TASK}`);
    expect(res.status).toBe(500);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('exactRefs pins whole refs, version included', async () => {
    const options = { allowedEndpoints: ['ana/helper', 'bob/model@v2'], exactRefs: true };
    expect((await send(options, 'POST', '/chats', { agent: 'ana/helper' })).status).toBe(200);
    expect((await send(options, 'POST', '/chats', { agent: 'bob/model@v2' })).status).toBe(200);
    expect((await send(options, 'GET', '/agents/ana/helper')).status).toBe(200);
    for (const agent of ['ana/helper@v1', 'bob/model', 'bob/model@v3', 'agent/ana/helper']) {
      expect((await send(options, 'POST', '/chats', { agent })).status).toBe(403);
    }
    expect((await send(options, 'GET', '/agents/ana/helper@v1')).status).toBe(403);
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it.each(['ana/*', 'ana', ''])('exactRefs refuses every request for an entry that is not a ref (%j)', async (pattern) => {
    const res = await send({ allowedEndpoints: [pattern], exactRefs: true }, 'GET', `/tasks/${TASK}`);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/is not an app or agent ref/);
  });

  it('refuses a target that carries credentials', async () => {
    const res = await send({}, 'GET', `/tasks/${TASK}`);
    expect(res.status).toBe(200);
    const handler = createHandler({ apiKey: 'site-key' });
    const bad = await handler({ request: proxied('GET', `https://u:p@api.inference.sh/tasks/${TASK}`) });
    expect(bad.status).toBe(400);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
