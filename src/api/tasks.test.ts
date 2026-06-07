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

    mockJsonResponse({ success: true, data: runningTask });
    mockJsonResponse({ success: true, data: { status: TaskStatusRunning } });
    mockJsonResponse({ success: true, data: { status: TaskStatusCompleted } });
    mockJsonResponse({ success: true, data: completedTask });

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

    mockJsonResponse({ success: true, data: runningTask });
    mockJsonResponse({ success: true, data: { status: TaskStatusRunning } });
    mockJsonResponse({ success: true, data: { status: TaskStatusFailed } });
    mockJsonResponse({ success: true, data: failedTask });

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true, stream: false })
    ).rejects.toThrow('model error');
  });

  it('should reject when polling detects a cancelled task', async () => {
    const runningTask = makeTask();
    const cancelledTask = makeTask({ status: TaskStatusCancelled });

    mockJsonResponse({ success: true, data: runningTask });
    mockJsonResponse({ success: true, data: { status: TaskStatusRunning } });
    mockJsonResponse({ success: true, data: { status: TaskStatusCancelled } });
    mockJsonResponse({ success: true, data: cancelledTask });

    await expect(
      api().run({ app: 'test-app', input: {} }, {}, { wait: true, stream: false })
    ).rejects.toThrow('task cancelled');
  });

  it('should parse string terminal statuses from the status endpoint', async () => {
    const runningTask = makeTask();
    const completedTask = makeTask({ status: TaskStatusCompleted });

    mockJsonResponse({ success: true, data: runningTask });
    mockJsonResponse({ success: true, data: { status: TaskStatusRunning } });
    mockJsonResponse({ success: true, data: { status: 'completed' } });
    mockJsonResponse({ success: true, data: completedTask });

    const result = await api().run(
      { app: 'test-app', input: {} },
      {},
      { wait: true, stream: false }
    );

    expect(result.status).toBe(TaskStatusCompleted);
  });
});
