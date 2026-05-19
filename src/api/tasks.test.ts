import { TasksAPI } from './tasks';
import { HttpClient } from '../http/client';
import { TaskStatusRunning, TaskStatusCompleted } from '../types';

describe('TasksAPI.run', () => {
  let mockRequest: jest.Mock;
  let tasks: TasksAPI;

  beforeEach(() => {
    mockRequest = jest.fn();
    const http = {
      request: mockRequest,
      getStreamDefault: jest.fn().mockReturnValue(false),
      getPollIntervalMs: jest.fn().mockReturnValue(100),
      getStreamableConfig: jest.fn(),
    } as unknown as HttpClient;
    tasks = new TasksAPI(http);
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should poll status until terminal and invoke onUpdate on status change', async () => {
    jest.useFakeTimers();

    const onUpdate = jest.fn();
    const createdTask = {
      id: 'task-1',
      status: TaskStatusRunning,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      input: {},
    };
    const completedTask = {
      ...createdTask,
      status: TaskStatusCompleted,
      output: { result: 'done' },
    };

    mockRequest
      .mockResolvedValueOnce(createdTask)
      .mockResolvedValueOnce({ status: TaskStatusRunning })
      .mockResolvedValueOnce({ status: TaskStatusCompleted })
      .mockResolvedValueOnce(completedTask);

    const runPromise = tasks.run(
      { app: 'test-app', input: {} },
      {},
      { stream: false, onUpdate }
    );

    await jest.runAllTimersAsync();

    const result = await runPromise;

    expect(result.status).toBe(TaskStatusCompleted);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-1', status: TaskStatusCompleted })
    );
    expect(mockRequest).toHaveBeenCalledWith('get', '/tasks/task-1/status');
    expect(mockRequest).toHaveBeenCalledWith('get', '/tasks/task-1');
  });

  it('should return immediately when wait is false', async () => {
    const createdTask = {
      id: 'task-early',
      status: TaskStatusRunning,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      input: { x: 1 },
      session_id: 'sess-1',
    };

    mockRequest.mockResolvedValueOnce(createdTask);

    const result = await tasks.run(
      { app: 'test-app', input: {} },
      { x: 1 },
      { wait: false }
    );

    expect(result.id).toBe('task-early');
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
