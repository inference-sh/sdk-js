import { HttpClient } from '../http/client';
import {
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusRunning,
} from '../types';
import { TasksAPI } from './tasks';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function jsonResponse(body: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

describe('TasksAPI.run (polling mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseTask = {
    id: 'task-1',
    status: TaskStatusRunning,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    input: { prompt: 'hello' },
  };

  it('should poll status until completion and return stripped task', async () => {
    const completedTask = {
      ...baseTask,
      status: TaskStatusCompleted,
      output: { text: 'done' },
    };

    mockFetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: baseTask }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { status: TaskStatusCompleted } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: completedTask }));

    const http = new HttpClient({ apiKey: 'key', stream: false });
    const tasks = new TasksAPI(http);
    const onUpdate = jest.fn();

    const result = await tasks.run(
      { app: 'org/app@v1', input: {} },
      { prompt: 'hello' },
      { stream: false, wait: true, onUpdate }
    );

    expect(result.status).toBe(TaskStatusCompleted);
    expect(result.output).toEqual({ text: 'done' });
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: TaskStatusCompleted }));
    expect(mockFetch.mock.calls.some((c) => String(c[0]).includes('/status'))).toBe(true);
  });

  it('should reject when polled task fails', async () => {
    const failedTask = {
      ...baseTask,
      status: TaskStatusFailed,
      error: 'model error',
    };

    mockFetch
      .mockResolvedValueOnce(jsonResponse({ success: true, data: baseTask }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { status: TaskStatusFailed } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: failedTask }));

    const http = new HttpClient({ apiKey: 'key', stream: false });
    const tasks = new TasksAPI(http);

    await expect(
      tasks.run({ app: 'org/app@v1', input: {} }, {}, { stream: false, wait: true })
    ).rejects.toThrow('model error');
  });
});
