import { HttpClient } from '../http/client';
import { StreamManager } from '../http/stream';
import {
  TaskDTO as Task,
  ApiAppRunRequest,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled,
  CursorListRequest,
  CursorListResponse,
} from '../types';

export interface RunOptions {
  /** Callback for real-time status updates */
  onUpdate?: (update: Task) => void;
  /** Callback for partial updates with list of changed fields */
  onPartialUpdate?: (update: Task, fields: string[]) => void;
  /** Wait for task completion (default: true) */
  wait?: boolean;
  /** Auto-reconnect on connection loss (default: true) */
  autoReconnect?: boolean;
  /** Maximum reconnection attempts (default: 5) */
  maxReconnects?: number;
  /** Delay between reconnection attempts in ms (default: 1000) */
  reconnectDelayMs?: number;
}

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
  };
}

/**
 * Tasks API
 */
export class TasksAPI {
  constructor(private readonly http: HttpClient) {}

  /**
   * List tasks with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<Task>> {
    return this.http.request<CursorListResponse<Task>>('post', '/tasks/list', { data: params });
  }

  /**
   * List featured tasks
   */
  async listFeatured(): Promise<Task[]> {
    return this.http.request<Task[]>('get', '/tasks/featured');
  }

  /**
   * Get a task by ID
   */
  async get(taskId: string): Promise<Task> {
    return this.http.request<Task>('get', `/tasks/${taskId}`);
  }

  /**
   * Create and run a task
   */
  async create(data: ApiAppRunRequest): Promise<Task> {
    return this.http.request<Task>('post', '/apps/run', { data });
  }

  /**
   * Delete a task
   */
  async delete(taskId: string): Promise<void> {
    return this.http.request<void>('delete', `/tasks/${taskId}`);
  }

  /**
   * Cancel a running task
   */
  async cancel(taskId: string): Promise<void> {
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
    const {
      onUpdate,
      onPartialUpdate,
      wait = true,
      autoReconnect = true,
      maxReconnects = 5,
      reconnectDelayMs = 1000,
    } = options;

    const task = await this.http.request<Task>('post', '/apps/run', {
      data: {
        ...params,
        input: processedInput,
      },
    });

    // Return immediately if not waiting
    if (!wait) {
      return stripTask(task);
    }

    // Wait for completion with optional updates
    return new Promise<Task>((resolve, reject) => {
      const streamManager = new StreamManager<Task>({
        createEventSource: async () => this.http.createEventSource(`/tasks/${task.id}/stream`),
        autoReconnect,
        maxReconnects,
        reconnectDelayMs,
        onData: (data) => {
          const stripped = stripTask(data);
          onUpdate?.(stripped);

          if (data.status === TaskStatusCompleted) {
            streamManager.stop();
            resolve(stripped);
          } else if (data.status === TaskStatusFailed) {
            streamManager.stop();
            reject(new Error(data.error || 'task failed'));
          } else if (data.status === TaskStatusCancelled) {
            streamManager.stop();
            reject(new Error('task cancelled'));
          }
        },
        onPartialData: (data, fields) => {
          const stripped = stripTask(data);
          onPartialUpdate?.(stripped, fields);

          if (data.status === TaskStatusCompleted) {
            streamManager.stop();
            resolve(stripped);
          } else if (data.status === TaskStatusFailed) {
            streamManager.stop();
            reject(new Error(data.error || 'task failed'));
          } else if (data.status === TaskStatusCancelled) {
            streamManager.stop();
            reject(new Error('task cancelled'));
          }
        },
        onError: (error) => {
          reject(error);
          streamManager.stop();
        },
      });

      streamManager.connect();
    });
  }

  /**
   * Update task visibility
   */
  async updateVisibility(taskId: string, visibility: string): Promise<Task> {
    return this.http.request<Task>('put', `/tasks/${taskId}/visibility`, { data: { visibility } });
  }

  /**
   * Feature/unfeature a task
   */
  async feature(taskId: string, featured: boolean): Promise<Task> {
    return this.http.request<Task>('put', `/tasks/${taskId}/feature`, { data: { featured } });
  }
}

export function createTasksAPI(http: HttpClient): TasksAPI {
  return new TasksAPI(http);
}
