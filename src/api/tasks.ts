import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import { StreamableManager } from '../http/streamable';
import { PollManager } from '../http/poll';
import {
  TaskDTO as Task,
  TaskLogsDTO,
  TaskTimingsDTO,
  ResourceStatusDTO,
  ApiAppRunRequest,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled,
  CursorListRequest,
  CursorListResponse,
} from '../types';
import { parseStatus } from '../utils';

/** How to follow a task while it runs; see TasksAPI.watch. */
export interface WatchOptions {
  /** Callback for real-time status updates */
  onUpdate?: (update: Task) => void;
  /** Callback for partial updates with list of changed fields */
  onPartialUpdate?: (update: Task, fields: string[]) => void;
  /** Maximum retry attempts when using polling mode (stream: false). Default: 5 */
  maxReconnects?: number;
  /** Use SSE streaming (true) or polling (false). Overrides client default. */
  stream?: boolean;
  /** Polling interval in ms when stream is false. Overrides client default. */
  pollIntervalMs?: number;
  /** Callback for streaming delta events (token-by-token updates) */
  onDelta?: (delta: Record<string, any>, seq: number) => void;
}

export interface RunOptions extends WatchOptions {
  /** Wait for task completion (default: true) */
  wait?: boolean;
}

/** A task being followed: `done` settles when it ends, `stop` ends the watch early. */
export interface TaskWatch {
  done: Promise<Task>;
  stop(): void;
}

//TODO: This is ugly...
function stripTask(task: Task): Task {
  return {
    ...task,
    id: task.id,
    created_at: task.created_at,
    updated_at: task.updated_at,
    input: task.input,
    output: task.output,
    logs: task.logs,
    status: task.status,
    session_id: task.session_id,
  };
}

/**
 * Tasks API
 */
export class TasksAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List tasks with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<Task>>> {
    return this.http.request<CursorListResponse<Task>>('post', '/tasks/list', { data: params });
  }

  /**
   * List featured tasks with cursor-based pagination
   */
  async listFeatured(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<Task>>> {
    return this.http.request<CursorListResponse<Task>>('get', '/tasks/featured', { params });
  }

  /**
   * Get a task by ID
   */
  async get(taskId: string): Promise<Response<Task>> {
    return this.http.request<Task>('get', `/tasks/${taskId}`);
  }

  /**
   * Create and run a task
   */
  async create(data: ApiAppRunRequest): Promise<Response<Task>> {
    return this.http.request<Task>('post', '/apps/run', { data });
  }

  /**
   * Delete a task
   */
  async delete(taskId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/tasks/${taskId}`);
  }

  /**
   * Cancel a running task
   */
  async cancel(taskId: string): Promise<Response<void>> {
    return this.http.request<void>('post', `/tasks/${taskId}/cancel`);
  }

  /**
   * Create an EventSource for streaming task updates
   */
  stream(taskId: string) {
    return this.http.createEventSource(`/tasks/${taskId}/stream`);
  }

  /**
   * Run a task and optionally wait for completion
   */
  async run(
    params: ApiAppRunRequest,
    processedInput: unknown,
    options: RunOptions = {}
  ): Promise<Task> {
    const { wait = true } = options;

    const resp = await this.http.request<Task>('post', '/apps/run', {
      data: {
        ...params,
        input: processedInput,
      },
    });
    const task = resp.data;

    // Return immediately if not waiting
    if (!wait) {
      return stripTask(task);
    }

    return this.watch(task, options).done;
  }

  /**
   * Follows a task until it ends. `done` resolves with the task when it
   * completes and rejects when it fails or is cancelled; `stop` ends the
   * watch early and leaves `done` pending.
   */
  watch(task: Pick<Task, 'id' | 'status'>, options: WatchOptions = {}): TaskWatch {
    const useStream = options.stream ?? this.http.getStreamDefault();
    return useStream ? this.watchStream(task, options) : this.watchPoll(task, options);
  }

  private watchStream(task: Pick<Task, 'id' | 'status'>, options: WatchOptions): TaskWatch {
    const { onUpdate, onPartialUpdate, onDelta } = options;
    // Accumulate state across partial updates to preserve fields like session_id
    let accumulatedTask = { ...task } as Task;
    const { url, headers, credentials } = this.http.getStreamableConfig(`/tasks/${task.id}/stream`);

    let streamManager: StreamableManager<Task>;
    const done = new Promise<Task>((resolve, reject) => {
      const settle = (data: Task, stripped: Task) => {
        if (parseStatus(data.status) === TaskStatusCompleted) {
          streamManager.stop();
          resolve(stripped);
        } else if (parseStatus(data.status) === TaskStatusFailed) {
          streamManager.stop();
          reject(new Error(data.error || 'task failed'));
        } else if (parseStatus(data.status) === TaskStatusCancelled) {
          streamManager.stop();
          reject(new Error('task cancelled'));
        }
      };
      streamManager = new StreamableManager<Task>({
        url,
        headers,
        credentials,
        onDelta,
        onData: (data) => {
          // Merge new data, preserving existing fields if not in update
          accumulatedTask = { ...accumulatedTask, ...data };
          const stripped = stripTask(accumulatedTask);
          onUpdate?.(stripped);
          settle(data, stripped);
        },
        onPartialData: (data, fields) => {
          // Merge partial update, preserving fields not in this update
          accumulatedTask = { ...accumulatedTask, ...data };
          const stripped = stripTask(accumulatedTask);
          onPartialUpdate?.(stripped, fields);
          settle(data, stripped);
        },
        onError: (error) => {
          reject(error);
          streamManager.stop();
        },
      });

      streamManager.start();
    });
    return { done, stop: () => streamManager.stop() };
  }

  /** Poll GET /tasks/{id}/status until terminal, full-fetch on status change. */
  private watchPoll(task: Pick<Task, 'id' | 'status'>, options: WatchOptions): TaskWatch {
    const { onUpdate, maxReconnects = 5 } = options;
    const intervalMs = options.pollIntervalMs ?? this.http.getPollIntervalMs();
    let prevStatus = task.status;

    let poller: PollManager<ResourceStatusDTO>;
    const done = new Promise<Task>((resolve, reject) => {
      poller = new PollManager<ResourceStatusDTO>({
        pollFunction: async () => {
          const resp = await this.http.request<ResourceStatusDTO>('get', `/tasks/${task.id}/status`);
          return resp.data;
        },
        intervalMs,
        maxRetries: maxReconnects,
        onData: async (statusData) => {
          if (statusData.status === prevStatus) return;
          prevStatus = statusData.status;

          // Status changed — fetch full task
          try {
            const fullResp = await this.http.request<Task>('get', `/tasks/${task.id}`);
            const fullTask = fullResp.data;
            const stripped = stripTask(fullTask);
            onUpdate?.(stripped);

            if (parseStatus(fullTask.status) === TaskStatusCompleted) {
              poller.stop();
              resolve(stripped);
            } else if (parseStatus(fullTask.status) === TaskStatusFailed) {
              poller.stop();
              reject(new Error(fullTask.error || 'task failed'));
            } else if (parseStatus(fullTask.status) === TaskStatusCancelled) {
              poller.stop();
              reject(new Error('task cancelled'));
            }
          } catch (err) {
            poller.stop();
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        },
        onError: (error) => {
          reject(error);
          poller.stop();
        },
      });

      poller.start();
    });
    return { done, stop: () => poller.stop() };
  }

  /**
   * Update task visibility
   */
  async updateVisibility(taskId: string, visibility: string): Promise<Response<Task>> {
    return this.http.request<Task>('post', `/tasks/${taskId}/visibility`, { data: { visibility } });
  }

  /**
   * Feature/unfeature a task
   */
  async feature(taskId: string, featured: boolean): Promise<Response<Task>> {
    return this.http.request<Task>('post', `/tasks/${taskId}/featured`, { data: { is_featured: featured } });
  }

  /**
   * Get task logs
   */
  async getLogs(taskId: string): Promise<Response<TaskLogsDTO>> {
    return this.http.request<TaskLogsDTO>('get', `/tasks/${taskId}/logs`);
  }

  /**
   * Get task timings
   */
  async getTimings(taskId: string): Promise<Response<TaskTimingsDTO>> {
    return this.http.request<TaskTimingsDTO>('get', `/tasks/${taskId}/timings`);
  }

  /**
   * Get task telemetry
   */
  async getTelemetry(taskId: string): Promise<Response<Record<string, unknown>[]>> {
    return this.http.request<Record<string, unknown>[]>('get', `/tasks/${taskId}/telemetry`);
  }
}

export function createTasksAPI(http: HttpClient): TasksAPI {
  return new TasksAPI(http);
}
