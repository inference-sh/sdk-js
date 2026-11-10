import { HttpClient } from '../http/client.js';
import { SandboxesAPI, SANDBOX_FILE_WRITE_MAX } from './sandboxes.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
    json: () => Promise.resolve(body),
  });
}

function lastCall(): [string, RequestInit] {
  return mockFetch.mock.calls[0] as [string, RequestInit];
}

describe('SandboxesAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new SandboxesAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /sandboxes/list for list()', async () => {
    const page = { items: [{ id: 'sb-1', name: 'dev' }], next_cursor: 'c2', has_next: true };
    mockJsonResponse(page);

    const result = await api().list({ limit: 1 });

    expect(result.data).toEqual(page);
    const [url, init] = lastCall();
    expect(url).toContain('/sandboxes/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 1 });
  });

  it('should GET /sandboxes/{id} for get()', async () => {
    mockJsonResponse({ id: 'sb-1', name: 'dev' });

    const result = await api().get('sb-1');

    expect(result.data).toEqual({ id: 'sb-1', name: 'dev' });
    const [url, init] = lastCall();
    expect(url).toContain('/sandboxes/sb-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /sandboxes for create()', async () => {
    mockJsonResponse({ id: 'sb-new', name: 'dev' });

    await api().create({ name: 'dev', vcpus: 4, credentials: [{ slug: 'github-app', mode: 'ask' }] });

    const [url, init] = lastCall();
    expect(url).toMatch(/\/sandboxes$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'dev', vcpus: 4, credentials: [{ slug: 'github-app', mode: 'ask' }] });
  });

  it.each([
    ['start', '/sandboxes/sb-1/start'],
    ['stop', '/sandboxes/sb-1/stop'],
  ] as const)('should POST %s', async (method, path) => {
    mockJsonResponse({ id: 'sb-1', desired_state: method === 'start' ? 'running' : 'stopped' });

    await api()[method]('sb-1');

    const [url, init] = lastCall();
    expect(url).toContain(path);
    expect(init.method).toBe('POST');
  });

  it('should DELETE /sandboxes/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('sb-1');

    const [url, init] = lastCall();
    expect(url).toContain('/sandboxes/sb-1');
    expect(init.method).toBe('DELETE');
  });
});

function mockBytesResponse(bytes: Uint8Array) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    arrayBuffer: () => Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)),
  });
}

describe('SandboxesAPI exec, files, limits', () => {
  const api = () => new SandboxesAPI(new HttpClient({ apiKey: 'k', baseUrl: 'https://api.test' }));

  beforeEach(() => jest.clearAllMocks());

  it('exec dispatches on the sandbox remote and waits', async () => {
    mockJsonResponse({ success: true, data: { id: 'sb1', remote_id: 'rm1', status: 'running' } });
    mockJsonResponse({ success: true, data: { run: { id: 'ex1', status: 'exited', exit_code: 0 }, done: true, stdout: 'hi\n', stderr: '' } });
    const res = await api().exec('sb1', 'echo', { args: ['hi'], waitSeconds: 30, timeoutMs: 5000 });
    expect(res.done).toBe(true);
    expect(res.run.exit_code).toBe(0);
    expect(res.stdout).toBe('hi\n');
    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toBe('https://api.test/remotes/rm1/execs?wait=30');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ command: 'echo', args: ['hi'], timeout_ms: 5000 });
  });

  it('exec waits 60 seconds by default', async () => {
    mockJsonResponse({ success: true, data: { id: 'sb1', remote_id: 'rm1', status: 'running' } });
    mockJsonResponse({ success: true, data: { run: { id: 'ex1', status: 'running' }, done: false, stdout: '', stderr: '' } });
    const res = await api().exec('sb1', 'sleep', { args: ['999'] });
    expect(res.done).toBe(false);
    expect(mockFetch.mock.calls[1][0]).toBe('https://api.test/remotes/rm1/execs?wait=60');
  });

  // wait=0 answers the bare run, not a result; over 600 the API refuses.
  it.each([0, 601, 1.5, -1])('exec refuses waitSeconds %p before any request', async (waitSeconds) => {
    await expect(api().exec('sb1', 'ls', { waitSeconds })).rejects.toThrow(RangeError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Past the heartbeat the API has sent 200; a failed wait is a problem body under it.
  it('exec throws a problem body that came under a 200', async () => {
    mockJsonResponse({ success: true, data: { id: 'sb1', remote_id: 'rm1', status: 'running' } });
    mockJsonResponse({ type: 'https://inference.sh/problems/internal', title: 'Internal', status: 500, detail: 'Failed to wait for exec' });
    await expect(api().exec('sb1', 'make', { waitSeconds: 300 })).rejects.toThrow('HTTP 500: Failed to wait for exec');
  });

  it('exec refuses a sandbox that is not running', async () => {
    mockJsonResponse({ success: true, data: { id: 'sb1', status: 'stopped', remote_id: 'rm1' } });
    await expect(api().exec('sb1', 'ls')).rejects.toThrow('stopped, not running');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('exec refuses a sandbox with no remote', async () => {
    mockJsonResponse({ success: true, data: { id: 'sb1', status: 'running' } });
    await expect(api().exec('sb1', 'ls')).rejects.toThrow('no remote yet');
  });

  it('lists, and escapes the path', async () => {
    mockJsonResponse({ success: true, data: [{ name: 'a b', kind: 'file', size: 1, mode: '644' }] });
    const res = await api().listFiles('sb1', '/home/user/a b');
    expect(res.data[0].name).toBe('a b');
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.test/sandboxes/sb1/files?path=%2Fhome%2Fuser%2Fa%20b');
  });

  it('reads a binary file as bytes', async () => {
    const bytes = new Uint8Array([0, 255, 10, 128]);
    mockBytesResponse(bytes);
    const got = await api().readFile('sb1', '/bin/x');
    expect(Array.from(got)).toEqual([0, 255, 10, 128]);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test/sandboxes/sb1/files/content?path=%2Fbin%2Fx');
    expect(init.method ?? 'GET').toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer k');
  });

  it('reads a text file as UTF-8, keeping a BOM', async () => {
    mockBytesResponse(new TextEncoder().encode('\ufeffhéllo'));
    expect(await api().readTextFile('sb1', '/a.txt')).toBe('\ufeffhéllo');
  });

  it('a refused read throws the API message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ error: { code: 'not_found', message: 'no such path: /nope' } })),
    });
    await expect(api().readFile('sb1', '/nope')).rejects.toThrow('no such path');
  });

  it('writes bytes with PUT as octet-stream', async () => {
    mockJsonResponse({ success: true, data: { path: '/tmp/a', size: 3 } });
    expect(await api().writeFile('sb1', '/tmp/a', new Uint8Array([1, 2, 3]))).toEqual({ path: '/tmp/a', size: 3 });
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test/sandboxes/sb1/files/content?path=%2Ftmp%2Fa');
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('application/octet-stream');
    expect(Array.from(init.body as Uint8Array)).toEqual([1, 2, 3]);
  });

  it('writes a string as UTF-8', async () => {
    mockJsonResponse({ success: true, data: { path: '/tmp/a', size: 2 } });
    await api().writeFile('sb1', '/tmp/a', 'é');
    expect(Array.from(mockFetch.mock.calls[0][1].body as Uint8Array)).toEqual([0xc3, 0xa9]);
  });

  it('refuses a write over 4 MiB before sending it', async () => {
    await expect(api().writeFile('sb1', '/tmp/big', new Uint8Array(SANDBOX_FILE_WRITE_MAX + 1))).rejects.toThrow('at most 4 MiB');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('deletes a file', async () => {
    mockJsonResponse({ success: true, data: null });
    await api().deleteFile('sb1', '/tmp/a');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test/sandboxes/sb1/files/content?path=%2Ftmp%2Fa');
    expect(init.method).toBe('DELETE');
  });

  it('reads limits', async () => {
    mockJsonResponse({ success: true, data: { running: { used: 1, limit: 5 }, vcpus: { used: 2, limit: -1 } } });
    const res = await api().limits();
    expect(res.data.running.limit).toBe(5);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.test/sandboxes/limits');
  });
});
