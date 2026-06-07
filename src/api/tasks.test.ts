import { HttpClient } from '../http/client';
import {
  TaskStatusCancelled,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusRunning,
} from '../types';
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

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    status: TaskStatusRunning,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    input: { prompt: 'hi' },
    output: null,
    logs: [],
    session_id: 'sess-1',
    ...overrides,
  };
}

describe('TasksAPI.run (polling mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () =>
    new TasksAPI(
      new HttpClient({
        apiKey: 'test-key',
        stream: false,
        pollIntervalMs: 20,
      })
    );

  it('should resolve when status polling detects completion', async () => {
    const runningTask = makeTask();
    const completedTask = makeTask({ status: TaskStatusCompleted, output: { ok: true } });

    mockJsonResponse(runningTask);
    mockJsonResponse({ status: TaskStatusRunning });
    mockJsonResponse({ status: TaskStatusCompleted });
    mockJsonResponse(completedTask);

    const onUpdate = jest.fn();
    const result = await api().run(
      { app: 'test-app', input: {} },
      { prompt: 'hi' },
      { wait: true, stream: false, onUpdate }
    );

    expect(result.status).toBe(TaskStatusCompleted);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1', status: TaskStatusCompleted })
    );
  });

  it('should reject when polling detects a failed task', async () => {
    const runningTask = makeTask();
    const failedTask = makeTask({ status: TaskStatusFailed, error: 'model error' });

    mockJsonResponse(runningTask);
    mockJsonResponse({ status: TaskStatusRunning });
    mockJsonResponse({ status: TaskStatusFailed });
    mockJsonResponse(failedTask);

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true, stream: false })
    ).rejects.toThrow('model error');
  });

  it('should reject when polling detects a cancelled task', async () => {
    const runningTask = makeTask();
    const cancelledTask = makeTask({ status: TaskStatusCancelled });

    mockJsonResponse(runningTask);
    mockJsonResponse({ status: TaskStatusRunning });
    mockJsonResponse({ status: TaskStatusCancelled });
    mockJsonResponse(cancelledTask);

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true, stream: false })
    ).rejects.toThrow('task cancelled');
  });

  it('should reject when full task fetch fails after status change', async () => {
    const runningTask = makeTask();

    mockJsonResponse(runningTask);
    mockJsonResponse({ status: TaskStatusRunning });
    mockJsonResponse({ status: TaskStatusCompleted });
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true, stream: false })
    ).rejects.toThrow('network down');
  });

  it('should reject when status polling fails', async () => {
    const runningTask = makeTask();

    mockJsonResponse(runningTask);
    mockFetch.mockRejectedValueOnce(new Error('status endpoint down'));

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true, stream: false })
    ).rejects.toThrow('status endpoint down');
  });

  it('should not refetch full task when poll status is unchanged', async () => {
    const runningTask = makeTask();
    const completedTask = makeTask({ status: TaskStatusCompleted, output: { ok: true } });

    mockJsonResponse(runningTask);
    mockJsonResponse({ status: TaskStatusRunning });
    mockJsonResponse({ status: TaskStatusRunning });
    mockJsonResponse({ status: TaskStatusCompleted });
    mockJsonResponse(completedTask);

    await api().run({ app: 'test-app', input: {} }, {}, { wait: true, stream: false });

    const fullTaskGets = mockFetch.mock.calls.filter(
      ([url, init]) =>
        String(url).includes('/tasks/task-1') &&
        !String(url).includes('/status') &&
        (init as RequestInit).method === 'GET'
    );
    expect(fullTaskGets).toHaveLength(1);
  });

  it('should parse string terminal statuses from the status endpoint', async () => {
    const runningTask = makeTask();
    const completedTask = makeTask({ status: TaskStatusCompleted });

    mockJsonResponse(runningTask);
    mockJsonResponse({ status: TaskStatusRunning });
    mockJsonResponse({ status: 'completed' });
    mockJsonResponse(completedTask);

    const result = await api().run(
      { app: 'test-app', input: {} },
      {},
      { wait: true, stream: false }
    );

    expect(result.status).toBe(TaskStatusCompleted);
  });
});

function mockNdjsonStream(chunks: string[]) {
  let chunkIndex = 0;
  const mockReader = {
    read: jest.fn().mockImplementation(async () => {
      if (chunkIndex >= chunks.length) {
        return { done: true, value: undefined };
      }
      return { done: false, value: new TextEncoder().encode(chunks[chunkIndex++]) };
    }),
    releaseLock: jest.fn(),
  };
  return {
    ok: true,
    status: 200,
    body: { getReader: () => mockReader },
  };
}

describe('TasksAPI.run (general)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const streamingApi = () => new TasksAPI(new HttpClient({ apiKey: 'test-key', stream: true }));

  it('should return immediately when wait is false', async () => {
    const task = makeTask();
    mockJsonResponse(task);

    const result = await streamingApi().run(
      { app: 'test-app', input: {} },
      { prompt: 'hi' },
      { wait: false }
    );

    expect(result.id).toBe('task-1');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('TasksAPI.run (streaming mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new TasksAPI(new HttpClient({ apiKey: 'test-key', stream: true }));

  function setupStreamMocks(ndjsonChunks: string[], initialTask = makeTask()) {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/apps/run')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(JSON.stringify(initialTask)),
        });
      }
      return Promise.resolve(mockNdjsonStream(ndjsonChunks));
    });
  }

  it('should resolve when NDJSON stream reports completion', async () => {
    setupStreamMocks([
      `${JSON.stringify({ status: TaskStatusRunning, id: 'task-1' })}\n`,
      `${JSON.stringify({ status: TaskStatusCompleted, id: 'task-1', output: { ok: true } })}\n`,
    ]);

    const onUpdate = jest.fn();
    const result = await api().run(
      { app: 'test-app', input: {} },
      { prompt: 'hi' },
      { wait: true, onUpdate }
    );

    expect(result.status).toBe(TaskStatusCompleted);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('should reject when NDJSON stream reports failure', async () => {
    setupStreamMocks([
      `${JSON.stringify({ status: TaskStatusFailed, id: 'task-1', error: 'gpu OOM' })}\n`,
    ]);

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true })
    ).rejects.toThrow('gpu OOM');
  });

  it('should reject when NDJSON stream reports cancellation', async () => {
    setupStreamMocks([
      `${JSON.stringify({ status: TaskStatusCancelled, id: 'task-1' })}\n`,
    ]);

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true })
    ).rejects.toThrow('task cancelled');
  });

  it('should reject when partial stream reports failure', async () => {
    setupStreamMocks([
      `${JSON.stringify({
        data: { status: TaskStatusFailed, id: 'task-1', error: 'partial fail' },
        fields: ['status'],
      })}\n`,
    ]);

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true })
    ).rejects.toThrow('partial fail');
  });

  it('should reject when partial stream reports cancellation', async () => {
    setupStreamMocks([
      `${JSON.stringify({
        data: { status: TaskStatusCancelled, id: 'task-1' },
        fields: ['status'],
      })}\n`,
    ]);

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true })
    ).rejects.toThrow('task cancelled');
  });

  it('should handle partial updates via onPartialUpdate', async () => {
    setupStreamMocks([
      `${JSON.stringify({
        data: { status: TaskStatusCompleted, id: 'task-1', session_id: 'sess-1' },
        fields: ['status'],
      })}\n`,
    ]);

    const onPartialUpdate = jest.fn();
    const result = await api().run(
      { app: 'test-app', input: {} },
      {},
      { wait: true, onPartialUpdate }
    );

    expect(result.status).toBe(TaskStatusCompleted);
    expect(onPartialUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1', status: TaskStatusCompleted }),
      ['status']
    );
  });
});

describe('TasksAPI.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new TasksAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /apps/run for create()', async () => {
    const task = makeTask();
    mockJsonResponse(task);

    const result = await api().create({ app: 'test-app', input: { prompt: 'hi' } });

    expect(result).toEqual(task);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/apps/run');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      app: 'test-app',
      input: { prompt: 'hi' },
    });
  });
});

describe('TasksAPI (CRUD and admin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new TasksAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST /tasks/list for list()', async () => {
    const page = { items: [{ id: 'task-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list({ limit: 5 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/tasks/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 5 });
  });

  it('should GET /tasks/featured for listFeatured()', async () => {
    const page = { items: [{ id: 'task-f' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().listFeatured({ cursor: 'abc' });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/tasks/featured');
    expect(init.method).toBe('GET');
  });

  it('should GET /tasks/{id} for get()', async () => {
    const task = makeTask();
    mockJsonResponse(task);

    const result = await api().get('task-1');

    expect(result).toEqual(task);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/tasks/task-1');
    expect(init.method).toBe('GET');
  });

  it('should DELETE /tasks/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('task-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/tasks/task-1');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /tasks/{id}/cancel for cancel()', async () => {
    mockJsonResponse(null);

    await api().cancel('task-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/tasks/task-1/cancel');
    expect(init.method).toBe('POST');
  });

  it('should POST visibility for updateVisibility()', async () => {
    const task = makeTask({ visibility: 'public' });
    mockJsonResponse(task);

    const result = await api().updateVisibility('task-1', 'public');

    expect(result).toEqual(task);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'public' });
  });

  it('should POST is_featured for feature()', async () => {
    const task = makeTask({ is_featured: true });
    mockJsonResponse(task);

    await api().feature('task-1', true);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/tasks/task-1/featured');
    expect(JSON.parse(init.body as string)).toEqual({ is_featured: true });
  });

  it('should open SSE on /tasks/{id}/stream for stream()', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const createEventSource = jest
      .spyOn(http, 'createEventSource')
      .mockResolvedValue(null);

    const tasks = new TasksAPI(http);
    await tasks.stream('task-42');

    expect(createEventSource).toHaveBeenCalledWith('/tasks/task-42/stream');
    createEventSource.mockRestore();
  });
});
