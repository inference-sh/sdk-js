import { HttpClient } from '../http/client';
import { TasksAPI } from './tasks';
import {
  TaskStatusRunning,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled,
  type TaskDTO,
} from '../types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function jsonFetchResponse(body: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  };
}

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 'task-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: 'private',
    status: TaskStatusRunning,
    input: { prompt: 'test' },
    output: null,
    logs: [],
    session_id: 'sess-1',
    user_public_key: '',
    engine_public_key: '',
    is_featured: false,
    app_id: 'app-1',
    app_version_id: 'v1',
    app_variant: 'default',
    function: 'run',
    infra: {} as TaskDTO['infra'],
    workers: [],
    ...overrides,
  } as TaskDTO;
}

describe('TasksAPI.run', () => {
  let http: HttpClient;
  let tasks: TasksAPI;

  beforeEach(() => {
    mockFetch.mockReset();
    http = new HttpClient({ apiKey: 'test-key', stream: false, pollIntervalMs: 20 });
    tasks = new TasksAPI(http);
  });

  describe('wait: false', () => {
    it('returns immediately without polling', async () => {
      const task = makeTask();
      mockFetch.mockResolvedValueOnce(jsonFetchResponse({ success: true, data: task }));

      const result = await tasks.run(
        { app: 'test-app', input: {} },
        { prompt: 'hello' },
        { wait: false }
      );

      expect(result.id).toBe('task-1');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('polling mode (stream: false)', () => {
    function setupPollMocks(options: {
      initialTask: TaskDTO;
      statusSequence: Array<number | string>;
      fullTaskOnChange: TaskDTO;
    }) {
      let statusIndex = 0;

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/apps/run')) {
          return Promise.resolve(
            jsonFetchResponse({ success: true, data: options.initialTask })
          );
        }
        if (url.includes('/status')) {
          const last = options.statusSequence[options.statusSequence.length - 1];
          const status = options.statusSequence[statusIndex] ?? last;
          statusIndex++;
          return Promise.resolve(jsonFetchResponse({ success: true, data: { status } }));
        }
        if (url.includes('/tasks/task-1')) {
          return Promise.resolve(
            jsonFetchResponse({ success: true, data: options.fullTaskOnChange })
          );
        }
        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
      });
    }

    it('polls status until completion and fetches full task on status change', async () => {
      const runningTask = makeTask({ status: TaskStatusRunning });
      const completedTask = makeTask({
        status: TaskStatusCompleted,
        output: { result: 'done' },
      });

      setupPollMocks({
        initialTask: runningTask,
        statusSequence: [TaskStatusRunning, TaskStatusCompleted],
        fullTaskOnChange: completedTask,
      });

      const runPromise = tasks.run(
        { app: 'test-app', input: {} },
        { prompt: 'hello' },
        { onUpdate: jest.fn() }
      );

      const result = await runPromise;
      expect(result.status).toBe(TaskStatusCompleted);
      expect(result.output).toEqual({ result: 'done' });
      expect(result.session_id).toBe('sess-1');
    });

    it('resolves when API returns string status completed', async () => {
      const runningTask = makeTask({ status: TaskStatusRunning });
      const completedTask = makeTask({ status: TaskStatusCompleted });

      setupPollMocks({
        initialTask: runningTask,
        statusSequence: ['running', 'completed'],
        fullTaskOnChange: { ...completedTask, status: 'completed' as unknown as number },
      });

      const result = await tasks.run({ app: 'test-app', input: {} }, {}, {});
      expect(result.status).toBe('completed');
    });

    it('rejects when task fails', async () => {
      const runningTask = makeTask({ status: TaskStatusRunning });
      const failedTask = makeTask({
        status: TaskStatusFailed,
        error: 'model timeout',
      });

      setupPollMocks({
        initialTask: runningTask,
        statusSequence: [TaskStatusRunning, TaskStatusFailed],
        fullTaskOnChange: failedTask,
      });

      await expect(tasks.run({ app: 'test-app', input: {} }, {}, {})).rejects.toThrow(
        'model timeout'
      );
    });

    it('rejects when task is cancelled', async () => {
      const runningTask = makeTask({ status: TaskStatusRunning });
      const cancelledTask = makeTask({ status: TaskStatusCancelled });

      setupPollMocks({
        initialTask: runningTask,
        statusSequence: [TaskStatusRunning, TaskStatusCancelled],
        fullTaskOnChange: cancelledTask,
      });

      await expect(tasks.run({ app: 'test-app', input: {} }, {}, {})).rejects.toThrow(
        'task cancelled'
      );
    });

    it('invokes onUpdate when status changes', async () => {
      const onUpdate = jest.fn();
      const runningTask = makeTask({ status: TaskStatusRunning });
      const completedTask = makeTask({
        status: TaskStatusCompleted,
        output: { result: 'done' },
      });

      setupPollMocks({
        initialTask: runningTask,
        statusSequence: [TaskStatusRunning, TaskStatusCompleted],
        fullTaskOnChange: completedTask,
      });

      await tasks.run({ app: 'test-app', input: {} }, {}, { onUpdate });

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'task-1',
          status: TaskStatusCompleted,
          output: { result: 'done' },
          session_id: 'sess-1',
        })
      );
    });
  });
});
