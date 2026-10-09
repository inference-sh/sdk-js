/**
 * The real SDK client, through the proxy, against a fake API: every call the
 * client makes to run an app or chat with an agent is forwarded, and the
 * proxy's endpoint list holds nothing those flows do not use.
 */
import { Inference } from '../index';
import * as agentApi from '../agent/api';
import { createHandler } from './remix';
import { PROXY_ENDPOINTS, type ProxyOptions } from './index';
import { TaskStatusCompleted, TaskStatusRunning } from '../types';

const API = 'https://api.inference.sh';
const PROXY = 'http://site.test/api/inference/proxy';
const STORAGE = 'https://storage.test';

// Ids as the API mints them (lowercase 26-character ULIDs); the proxy takes
// no other shape.
const TASK = '01j9z3m8k2c9v7b4n6q5r0t1wx';
const CHAT = '01j9z3m8k2c9v7b4n6q5r0c4at';
const MSG1 = '01j9z3m8k2c9v7b4n6q5r0m5g1';
const MSG2 = '01j9z3m8k2c9v7b4n6q5r0m5g2';
const TOOL = '01j9z3m8k2c9v7b4n6q5r0t001';
const RUN = '01j9z3m8k2c9v7b4n6q5r0r0n1';
const INTERRUPT = '01j9z3m8k2c9v7b4n6q5r0n7r1';

type Seen = { method: string; path: string };

const ndjson = (lines: unknown[]) =>
  new Response(lines.map((l) => JSON.stringify(l)).join('\n') + '\n', {
    status: 200,
    headers: { 'content-type': 'application/x-ndjson' },
  });
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

/** Answers each API route the flows use with just enough to finish them. */
function fakeApi(method: string, url: URL): Response {
  const p = url.pathname;
  const task = { id: TASK, status: TaskStatusCompleted, output: { text: 'done' } };
  const chat = { id: CHAT, status: 'idle', chat_messages: [] };
  const assistant = { id: MSG2, chat_id: CHAT, status: 'ready' };
  if (p === '/files') return json([{ id: 'file1', uri: 'inf://file1', content_type: 'image/png', upload_url: `${STORAGE}/file1` }]);
  if (p === '/apps/run') return json({ id: TASK, status: TaskStatusRunning });
  if (p === `/tasks/${TASK}`) return json(task);
  if (p === `/tasks/${TASK}/status`) return json({ status: TaskStatusCompleted });
  if (p === `/tasks/${TASK}/stream`) return ndjson([{ data: task }]);
  if (p === '/agents/run') return json({ user_message: { id: MSG1, chat_id: CHAT }, assistant_message: assistant });
  if (p === '/chats' && method === 'POST') return json(chat);
  if (p === `/chats/${CHAT}/messages` && method === 'POST') return json({ id: MSG1, chat_id: CHAT });
  if (p === `/chats/${CHAT}/messages`) return json({ items: [], next_cursor: '', has_next: false });
  if (p === `/chats/${CHAT}/status`) return json({ status: 'idle' });
  if (p === `/chats/${CHAT}`) return json(chat);
  if (p === `/chats/${CHAT}/stream`) {
    return ndjson([
      { event: 'chats', data: { id: CHAT, status: 'busy' } },
      { event: 'chat_messages', data: assistant },
      { event: 'chats', data: { id: CHAT, status: 'idle' } },
    ]);
  }
  if (p === '/agents/ana/helper') return json({ id: 'agent1', version: { description: 'helper' } });
  if (p === `/chats/${CHAT}/agent`) return json({ id: 'agent1' });
  return json({});
}

/**
 * Route the client's fetches: proxy URL to the proxy handler, API URL to the
 * fake API, storage URL to a successful upload. Records what reached the API
 * and every proxy refusal.
 */
function installNetwork(options: ProxyOptions<Request> = {}) {
  const handler = createHandler({ apiKey: 'site-key', ...options });
  const seen: Seen[] = [];
  const refused: { status: number; body: string }[] = [];
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.origin === new URL(PROXY).origin) {
      const res = await handler({ request: new Request(url, init) });
      if (res.status >= 400) refused.push({ status: res.status, body: await res.clone().text() });
      return res;
    }
    if (url.origin === API) {
      expect((init?.headers as Record<string, string>).authorization).toBe('Bearer site-key');
      seen.push({ method, path: url.pathname });
      return fakeApi(method, url);
    }
    if (url.origin === STORAGE) return new Response(null, { status: 200 });
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
  return { seen, refused };
}

/** Drive every app-run and agent-chat path of the SDK client through the proxy. */
async function runAllFlows() {
  const client = new Inference({ proxyUrl: PROXY, pollIntervalMs: 5 });
  const image = new Blob(['png'], { type: 'image/png' });

  // Apps: stream (default), poll, no wait; a Blob input uploads first.
  await client.run({ app: 'ana/helper', input: { image } });
  await client.run({ app: 'ana/helper@v1', input: { prompt: 'x' } }, { stream: false });
  await client.run({ app: 'ana/helper', input: {} }, { wait: false });
  await client.cancel(TASK);
  await client.getTask(TASK);

  // agent().sendMessage: new chat and continuation (stream), new chat (poll).
  const agent = client.agent('ana/helper');
  await agent.sendMessage('hi', { onMessage: () => {} });
  await agent.sendMessage('again', { onMessage: () => {} });
  await client.agent('ana/helper').sendMessage('poll', { stream: false });
  await agent.getChat();
  await agent.stopChat();
  await agent.submitToolResult(TOOL, 'ok');
  agent.disconnect();

  // The chat provider's calls (@inferencesh/sdk/agent).
  const file = new File(['png'], 'a.png', { type: 'image/png' });
  await agentApi.sendMessage(client, { agent: 'ana/helper' }, null, 'hi', [file]);
  await agentApi.sendMessage(client, { core_app: { ref: 'ana/model@v2' } } as never, null, 'hi');
  await agentApi.sendMessage(client, { agent: 'ana/helper' }, CHAT, 'again');
  await agentApi.fetchAgentInfo(client, 'ana/helper');
  await agentApi.fetchChat(client, CHAT);
  await agentApi.stopChat(client, CHAT);
  await agentApi.cancelMessage(client, MSG1);
  await agentApi.setAgent(client, CHAT, 'ana/other');
  await agentApi.submitToolResult(client, TOOL, 'ok');
  const stream = await agentApi.chatStreamRequest(client, CHAT)({ method: 'GET', headers: {} });
  await stream.text();
}

describe('SDK client through the proxy', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each([
    ['default options', {}],
    ['allowedEndpoints covering the refs used', { allowedEndpoints: ['ana/*'] }],
  ])('forwards every call of app runs and agent chats (%s)', async (_name, options) => {
    const { seen, refused } = installNetwork(options);
    await runAllFlows();

    expect(refused).toEqual([]);
    // Each endpoint the proxy forwards is one these flows use.
    const used = new Set(seen.map(({ method, path }) =>
      PROXY_ENDPOINTS.findIndex((e) => e.method === method && e.path.test(path))));
    expect(used.has(-1)).toBe(false);
    const unused = PROXY_ENDPOINTS.filter((_, i) => !used.has(i)).map((e) => `${e.method} ${e.path.source}`);
    expect(unused).toEqual([]);
  });

  it('refuses tool approvals and "allow all tools": the API takes them only from the account holder\'s sign-in', async () => {
    const { seen } = installNetwork({ allowedEndpoints: ['ana/*'] });
    const client = new Inference({ proxyUrl: PROXY });
    const calls: [string, () => Promise<unknown>][] = [
      ['approve', () => agentApi.approveTool(client, TOOL)],
      ['reject', () => agentApi.rejectTool(client, TOOL, 'no')],
      ['always-allow options', () => agentApi.getAlwaysAllowOptions(client, CHAT, TOOL)],
      ['always allow', () => agentApi.alwaysAllowTool(client, CHAT, TOOL)],
      ['explain', () => agentApi.explainTool(client, CHAT, TOOL)],
      ['allow all tools', () => agentApi.updateChatSettings(client, CHAT, { allow_all_tools: true })],
      ['resolve', () => agentApi.resolveInterrupt(client, INTERRUPT, 'allow')],
      ['list interrupts', () => agentApi.listRunInterrupts(client, RUN)],
    ];
    for (const [name, call] of calls) {
      await expect(call().then(() => name)).rejects.toMatchObject({ statusCode: 403 });
    }
    expect(seen).toEqual([]);
  });

  it('refuses runs and chats of apps and agents outside allowedEndpoints', async () => {
    const { seen } = installNetwork({ allowedEndpoints: ['bob/*'] });
    const client = new Inference({ proxyUrl: PROXY });

    await expect(client.run({ app: 'ana/helper', input: {} })).rejects.toMatchObject({ statusCode: 403 });
    await expect(client.agent('ana/helper').sendMessage('hi')).rejects.toMatchObject({ statusCode: 403 });
    await expect(agentApi.sendMessage(client, { agent: 'ana/helper' }, null, 'hi')).rejects.toMatchObject({ statusCode: 403 });
    await expect(client.agent({ core_app: { ref: 'bob/model' } } as never).sendMessage('hi')).rejects.toMatchObject({ statusCode: 403 });
    expect(seen).toEqual([]);
  });
});
