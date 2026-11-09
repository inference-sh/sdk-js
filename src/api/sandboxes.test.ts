import { HttpClient } from '../http/client.js';
import { SandboxesAPI } from './sandboxes.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function json(body: unknown) {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) });
}

describe('SandboxesAPI', () => {
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
