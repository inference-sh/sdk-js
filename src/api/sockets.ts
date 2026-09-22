import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import { LiveSession, type LiveHandlers, type WebSocketConstructor } from '../live/session';
import { CursorListRequest, CursorListResponse, OpEqual, SocketAccess, SocketDTO, TaskDTO as Task } from '../types';
import type { TasksAPI } from './tasks';

/** What identifies the socket to open: the run response (which carries the access), a task, or a task id. */
export type SocketTarget = (Pick<Task, 'id' | 'status'> & { socket?: SocketAccess }) | string;

export interface OpenSocketOptions {
  /**
   * Follow the task while waiting for the app, and end the session if the
   * task ends first (default: true). Off, a task that fails before its
   * worker dials leaves the session waiting until the relay's pair timeout.
   */
  watchTask?: boolean;
  /** The WebSocket to dial with; defaults to the runtime's global one. */
  webSocket?: WebSocketConstructor;
}

/**
 * Sockets API: the duplex connection of a stream task.
 *
 * A stream function keeps a socket open with its caller for the life of the
 * task. The run response carries the caller's end (`task.socket`); `open`
 * dials it and gives back a LiveSession.
 */
export class SocketsAPI {
  constructor(
    private readonly http: HttpClient,
    private readonly tasks: TasksAPI
  ) {}

  async get(id: string): Promise<Response<SocketDTO>> {
    return this.http.request<SocketDTO>('get', `/sockets/${id}`);
  }

  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<SocketDTO>>> {
    return this.http.request<CursorListResponse<SocketDTO>>('post', '/sockets/list', { data: params });
  }

  /** The task's socket, or null when it has none (not a stream function). */
  async forTask(taskId: string): Promise<SocketDTO | null> {
    const res = await this.list({ limit: 1, filters: [{ field: 'task_id', operator: OpEqual, value: taskId }] });
    return res.data?.items?.[0] ?? null;
  }

  /** A fresh credential for the caller's end, e.g. after a reload or to redial. */
  async access(id: string): Promise<Response<SocketAccess>> {
    return this.http.request<SocketAccess>('post', `/sockets/${id}/access`);
  }

  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/sockets/${id}`);
  }

  /**
   * Dials the caller's end of a stream task's socket. The session is
   * `waiting` until the app's first frame, then `live`; see LiveSession.
   */
  async open(target: SocketTarget, handlers: LiveHandlers = {}, options: OpenSocketOptions = {}): Promise<LiveSession> {
    const task = typeof target === 'string' ? (await this.tasks.get(target)).data : target;
    let access = typeof target === 'string' ? undefined : target.socket;
    let socketId = access?.id;
    if (!access) {
      const socket = await this.forTask(task.id);
      if (!socket) throw new Error(`task ${task.id} has no socket: is it a stream function?`);
      socketId = socket.id;
      access = (await this.access(socket.id)).data;
    }

    const session = new LiveSession({
      access,
      handlers,
      renew: async () => (await this.access(socketId!)).data,
      task: options.watchTask === false ? undefined : this.tasks.watch(task),
      webSocket: options.webSocket,
    });
    session.connect();
    return session;
  }
}

export function createSocketsAPI(http: HttpClient, tasks: TasksAPI): SocketsAPI {
  return new SocketsAPI(http, tasks);
}
