import { HttpClient } from '../http/client';
import type { WebSocketLike } from '../live/session';
import { TaskStatusRunning, type TaskDTO } from '../types';
import { SocketsAPI } from './sockets';
import { TasksAPI } from './tasks';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

class FakeWebSocket implements WebSocketLike {
  static dialed: FakeWebSocket[] = [];
  binaryType = 'blob';
  readyState = 0;
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  constructor(readonly url: string) {
    FakeWebSocket.dialed.push(this);
  }
  send(): void {}
  close(): void {}
}

const access = { id: 'sock-1', url: 'wss://relay.test/sockets/sock-1', token: 'tok', expires_at: '2030-01-01T00:00:00Z' };
const task: Pick<TaskDTO, 'id' | 'status'> = { id: 'task-1', status: TaskStatusRunning };

function api() {
  const http = new HttpClient({ apiKey: 'test-key', stream: false, pollIntervalMs: 60_000 });
  return new SocketsAPI(http, new TasksAPI(http));
}

function requests() {
  return mockFetch.mock.calls.map(([url, init]) => `${(init as RequestInit).method} ${new URL(String(url)).pathname}`);
}

describe('SocketsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    FakeWebSocket.dialed = [];
  });

  it('reads, lists and renews sockets', async () => {
    mockJsonResponse({ id: 'sock-1', task_id: 'task-1' });
    mockJsonResponse({ items: [{ id: 'sock-1', task_id: 'task-1' }] });
    mockJsonResponse(access);
    mockJsonResponse(null);

    expect((await api().get('sock-1')).data.id).toBe('sock-1');
    expect((await api().forTask('task-1'))?.id).toBe('sock-1');
    expect((await api().access('sock-1')).data.token).toBe('tok');
    await api().delete('sock-1');

    expect(requests()).toEqual(['GET /sockets/sock-1', 'POST /sockets/list', 'POST /sockets/sock-1/access', 'DELETE /sockets/sock-1']);
    const listBody = JSON.parse((mockFetch.mock.calls[1][1] as RequestInit).body as string);
    expect(listBody.filters).toEqual([{ field: 'task_id', operator: 'eq', value: 'task-1' }]);
  });

  it('dials the access the run response carries without asking for anything', async () => {
    const session = await api().open({ ...task, socket: access }, {}, { webSocket: FakeWebSocket, watchTask: false });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(FakeWebSocket.dialed[0].url).toBe('wss://relay.test/sockets/sock-1?access_token=tok');
    expect(session.state).toBe('connecting');
  });

  it('finds the socket of a task id and issues a credential for it', async () => {
    mockJsonResponse(task);
    mockJsonResponse({ items: [{ id: 'sock-1', task_id: 'task-1' }] });
    mockJsonResponse(access);
    await api().open('task-1', {}, { webSocket: FakeWebSocket, watchTask: false });
    expect(requests()).toEqual(['GET /tasks/task-1', 'POST /sockets/list', 'POST /sockets/sock-1/access']);
    expect(FakeWebSocket.dialed).toHaveLength(1);
  });

  it('returns null when a task has no socket row', async () => {
    mockJsonResponse({ items: [] });
    expect(await api().forTask('task-1')).toBeNull();
  });

  it('refuses a task without a socket', async () => {
    mockJsonResponse({ items: [] });
    await expect(api().open(task, {}, { webSocket: FakeWebSocket })).rejects.toThrow(/has no socket/);
  });

  it('follows the task while waiting, and stops when the session ends', async () => {
    mockJsonResponse({ status: TaskStatusRunning }); // the first poll
    const session = await api().open({ ...task, socket: access }, {}, { webSocket: FakeWebSocket });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(requests()).toEqual(['GET /tasks/task-1/status']);
    session.close();
    FakeWebSocket.dialed[0].onclose?.({ code: 1000, reason: 'done' });
    expect(session.state).toBe('ended');
  });
});
