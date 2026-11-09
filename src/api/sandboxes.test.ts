import { HttpClient } from '../http/client.js';
import { SandboxesAPI } from './sandboxes.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
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

function json(body: unknown) {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
}

describe('SandboxesAPI exec, files, limits', () => {
  const api = () => new SandboxesAPI(new HttpClient({ apiKey: 'k', baseUrl: 'https://api.test' }));

  beforeEach(() => jest.clearAllMocks());

  it('exec dispatches on the sandbox remote and waits', async () => {
    json({ success: true, data: { id: 'sb1', remote_id: 'rm1', status: 'running' } });
    json({ success: true, data: { run: { id: 'ex1', status: 'exited', exit_code: 0 }, done: true, stdout: 'hi\n', stderr: '' } });
    const res = await api().exec('sb1', 'echo', { args: ['hi'], waitSeconds: 30 });
    expect(res.done).toBe(true);
    expect(res.stdout).toBe('hi\n');
    const [url, init] = mockFetch.mock.calls[1];
    expect(url).toBe('https://api.test/remotes/rm1/execs?wait=30');
    expect(JSON.parse(init.body)).toMatchObject({ command: 'echo', args: ['hi'] });
  });

  it('exec refuses a sandbox with no remote', async () => {
    json({ success: true, data: { id: 'sb1', status: 'pending' } });
    await expect(api().exec('sb1', 'ls')).rejects.toThrow('no remote yet');
  });

  it('lists, and escapes the path', async () => {
    json({ success: true, data: [{ name: 'a b', kind: 'file', size: 1, mode: '644' }] });
    const res = await api().listFiles('sb1', '/home/user/a b');
    expect(res.data[0].name).toBe('a b');
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.test/sandboxes/sb1/files?path=%2Fhome%2Fuser%2Fa%20b');
  });

  it('reads limits', async () => {
    json({ success: true, data: { running: { used: 1, limit: 5 }, vcpus: { used: 2, limit: -1 } } });
    const res = await api().limits();
    expect(res.data.running.limit).toBe(5);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.test/sandboxes/limits');
  });
});
