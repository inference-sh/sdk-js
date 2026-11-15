import { HttpClient } from '../http/client.js';
import { ScopeAppsExecute, ScopeFilesWrite } from '../types.js';
import { SandboxesAPI } from './sandboxes.js';
import { FilesAPI } from './files.js';

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

  it('should forward api_scopes on create() instead of vault_id (0.40.0)', async () => {
    mockJsonResponse({ id: 'sb-scoped', name: 'scoped' });

    await api().create({
      name: 'scoped',
      api_scopes: [ScopeAppsExecute, ScopeFilesWrite],
    });

    const [, init] = lastCall();
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.api_scopes).toEqual([ScopeAppsExecute, ScopeFilesWrite]);
    expect(body).not.toHaveProperty('vault_id');
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
  const api = () => {
    const http = new HttpClient({ apiKey: 'k', baseUrl: 'https://api.test' });
    return new SandboxesAPI(http, new FilesAPI(http));
  };

  beforeEach(() => jest.clearAllMocks());

  it('exec dispatches on the sandbox remote and waits', async () => {
    mockJsonResponse({ success: true, data: { id: 'sb1', remote_id: 'rm1', status: 'running' } });
    mockJsonResponse({ success: true, data: { run: { id: 'ex1', status: 'exited', exit_code: 0 }, stdout: 'hi\n', stderr: '' } });
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
    mockJsonResponse({ success: true, data: { run: { id: 'ex1', status: 'running' }, stdout: '', stderr: '' } });
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

  it('exec keeps the remote id: the next exec on the sandbox does not look it up', async () => {
    const sandboxes = api();
    mockJsonResponse({ success: true, data: { id: 'sb1', remote_id: 'rm1', status: 'running' } });
    mockJsonResponse({ success: true, data: { run: { id: 'ex1', status: 'exited' }, stdout: '', stderr: '' } });
    mockJsonResponse({ success: true, data: { run: { id: 'ex2', status: 'killed' }, stdout: '', stderr: '' } });
    await sandboxes.exec('sb1', 'true');
    expect((await sandboxes.exec('sb1', 'true')).done).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[2][0]).toBe('https://api.test/remotes/rm1/execs?wait=60');
  });

  it.each([404, 409])('exec looks the remote up again once when the kept one answers %p', async (status) => {
    const sandboxes = api();
    mockJsonResponse({ success: true, data: { id: 'sb1', remote_id: 'rm1', status: 'running' } });
    mockJsonResponse({ success: true, data: { run: { id: 'ex1', status: 'exited' }, stdout: '', stderr: '' } });
    await sandboxes.exec('sb1', 'true');
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      text: () => Promise.resolve(JSON.stringify({ title: 'gone', status, detail: 'remote gone' })),
    });
    mockJsonResponse({ success: true, data: { id: 'sb1', remote_id: 'rm2', status: 'running' } });
    mockJsonResponse({ success: true, data: { run: { id: 'ex2', status: 'exited' }, stdout: 'ok', stderr: '' } });
    expect((await sandboxes.exec('sb1', 'true')).stdout).toBe('ok');
    expect(mockFetch.mock.calls[3][0]).toBe('https://api.test/sandboxes/sb1');
    expect(mockFetch.mock.calls[4][0]).toBe('https://api.test/remotes/rm2/execs?wait=60');
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

  it('reads a binary file: an export, then the download, then the storage copy deleted', async () => {
    mockJsonResponse({ success: true, data: { path: '/bin/x', file: { id: 'f1', size: 4 }, download_url: 'https://store.test/f1?sig=1' } });
    mockBytesResponse(new Uint8Array([0, 255, 10, 128]));
    mockJsonResponse({ success: true, data: null });
    const got = await api().readFile('sb1', '/bin/x');
    expect(Array.from(got)).toEqual([0, 255, 10, 128]);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test/sandboxes/sb1/files/export');
    expect(JSON.parse(init.body)).toEqual({ path: '/bin/x' });
    expect(mockFetch.mock.calls[1][0]).toBe('https://store.test/f1?sig=1');
    expect(mockFetch.mock.calls[1][1]).toBeUndefined();
    expect(mockFetch.mock.calls[2][0]).toBe('https://api.test/files/f1');
    expect(mockFetch.mock.calls[2][1].method).toBe('DELETE');
  });

  it('reads a text file as UTF-8, keeping a BOM', async () => {
    mockJsonResponse({ success: true, data: { path: '/a.txt', file: { id: 'f1', size: 8 }, download_url: 'https://store.test/f1' } });
    mockBytesResponse(new TextEncoder().encode('\ufeffhéllo'));
    mockJsonResponse({ success: true, data: null });
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

  it('an export that failed after the 200 throws its problem body', async () => {
    mockJsonResponse({ type: 'about:blank', title: 'Conflict', status: 409, detail: '/a changed size during the transfer; try again' });
    await expect(api().exportFile('sb1', '/a')).rejects.toThrow('changed size');
  });

  it('writes bytes: an upload, the import, then the storage copy deleted', async () => {
    mockJsonResponse({ success: true, data: [{ id: 'f9', upload_url: 'https://store.test/put/f9' }] });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });
    mockJsonResponse({ success: true, data: { path: '/tmp/a', file: { id: 'f9', size: 3 } } });
    mockJsonResponse({ success: true, data: null });
    expect(await api().writeFile('sb1', '/tmp/a', new Uint8Array([1, 2, 3]))).toEqual({ path: '/tmp/a', file: { id: 'f9', size: 3 } });
    const create = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(create.files[0].filename).toBe('a');
    expect(create.files[0].size).toBe(3);
    expect(mockFetch.mock.calls[1][0]).toBe('https://store.test/put/f9');
    expect(mockFetch.mock.calls[1][1].method).toBe('PUT');
    const [url, init] = mockFetch.mock.calls[2];
    expect(url).toBe('https://api.test/sandboxes/sb1/files/import');
    expect(JSON.parse(init.body)).toEqual({ path: '/tmp/a', file_id: 'f9' });
    expect(mockFetch.mock.calls[3][0]).toBe('https://api.test/files/f9');
    expect(mockFetch.mock.calls[3][1].method).toBe('DELETE');
  });

  it('deletes the storage copy when the import fails', async () => {
    mockJsonResponse({ success: true, data: [{ id: 'f9', upload_url: 'https://store.test/put/f9' }] });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: () => Promise.resolve(JSON.stringify({ error: { code: 'conflict', message: 'the sandbox is not running; start it first' } })),
    });
    mockJsonResponse({ success: true, data: null });
    await expect(api().writeFile('sb1', '/tmp/a', 'hi')).rejects.toThrow('not running');
    expect(mockFetch.mock.calls[3][0]).toBe('https://api.test/files/f9');
  });

  it('deletes the file record when the upload PUT fails', async () => {
    mockJsonResponse({ success: true, data: [{ id: 'f9', upload_url: 'https://store.test/put/f9' }] });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });
    mockJsonResponse({ success: true, data: null });
    await expect(api().writeFile('sb1', '/tmp/a', 'hi')).rejects.toThrow('Forbidden');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[2][0]).toBe('https://api.test/files/f9');
    expect(mockFetch.mock.calls[2][1].method).toBe('DELETE');
  });

  // The export's storage copy could not be deleted after: nothing is sent.
  it('readFile on a bare SandboxesAPI refuses before exporting', async () => {
    const bare = new SandboxesAPI(new HttpClient({ apiKey: 'k', baseUrl: 'https://api.test' }));
    await expect(bare.readFile('sb1', '/etc/hosts')).rejects.toThrow('needs the files API');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('refuses an empty write before sending it', async () => {
    await expect(api().writeFile('sb1', '/tmp/empty', '')).rejects.toThrow(RangeError);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('deletes a file', async () => {
    mockJsonResponse({ success: true, data: null });
    await api().deleteFile('sb1', '/tmp/a');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.test/sandboxes/sb1/files?path=%2Ftmp%2Fa');
    expect(init.method).toBe('DELETE');
  });

  it('reads limits', async () => {
    mockJsonResponse({
      success: true,
      data: {
        limits: [
          { resource: 'sandbox_vcpus', label: 'vCPUs', type: 'limit', usage: 2, limit: 0, unlimited: true, enabled: true, mode: 'block' },
          { resource: 'sandboxes', label: 'Sandboxes', type: 'limit', usage: 1, limit: 5, unlimited: false, enabled: true, mode: 'block' },
        ],
        vcpus_per_sandbox: { default: 2, max: 8 },
      },
    });
    const res = await api().limits();
    expect(res.data.limits.find((l) => l.resource === 'sandboxes')?.limit).toBe(5);
    expect(res.data.limits.find((l) => l.resource === 'sandbox_vcpus')?.unlimited).toBe(true);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.test/sandboxes/limits');
  });
});
