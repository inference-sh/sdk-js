import { HttpClient } from '../http/client.js';
import type { Response } from '../http/response.js';
import {
  CreateSandboxRequest,
  CursorListRequest,
  CursorListResponse,
  SandboxDTO,
} from '../types.js';

// TODO(models): use the generated types once the models release carries them.

/** One command run on a remote (the API's ExecRunDTO, the fields read here). */
export interface SandboxExecRun {
  id: string;
  status: 'pending' | 'running' | 'exited' | 'killed' | 'denied';
  exit_code?: number;
  timed_out?: boolean;
  error?: string;
  [key: string]: unknown;
}

/** The result of {@link SandboxesAPI.exec}: the run, and the last MiB of each stream. */
export interface SandboxExecResult {
  run?: SandboxExecRun;
  /** false: the command was still running when the wait ran out; it keeps running. */
  done: boolean;
  stdout: string;
  stderr: string;
}

export interface SandboxExecOptions {
  args?: string[];
  cwd?: string;
  /** KEY=VALUE entries. */
  env?: string[];
  /** Kill the command after this long (ms). */
  timeoutMs?: number;
  /** How long to wait for it to finish, in seconds (1-600). Default 60. */
  waitSeconds?: number;
}

/** One entry of a directory on a running sandbox. */
export interface SandboxFileEntry {
  name: string;
  kind: 'file' | 'dir' | 'link' | 'other';
  size: number;
  /** Octal permission bits, e.g. "644". */
  mode: string;
  modified_at?: string;
}

export interface SandboxLimit {
  used: number;
  /** -1: no limit applies. */
  limit: number;
}

export interface SandboxRange {
  default: number;
  max: number;
}

/** What the team may run now, and the sizes one sandbox may ask for. */
export interface SandboxLimits {
  running: SandboxLimit;
  vcpus: SandboxLimit;
  vcpus_per_sandbox: SandboxRange;
  memory_mib: SandboxRange;
  disk_mib: SandboxRange;
  /** Seconds; 0 never stops. */
  idle_timeout_default: number;
  idle_timeout_min: number;
  idle_timeout_max: number;
  /** Seconds a stopped sandbox's disk is kept. */
  disk_kept_for: number;
}

const filesPath = (id: string, rest: string, path: string) =>
  `/sandboxes/${encodeURIComponent(id)}/files${rest}?path=${encodeURIComponent(path)}`;

/**
 * Sandboxes API
 *
 * A sandbox is a box on one of our engines that runs belt and connects back
 * as a remote. The owner sets what it should be (running, stopped, deleted);
 * start, stop and delete answer at once and the status follows.
 */
export class SandboxesAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List the caller's sandboxes with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<SandboxDTO>>> {
    return this.http.request<CursorListResponse<SandboxDTO>>('post', '/sandboxes/list', { data: params });
  }

  /**
   * Get a sandbox by ID
   */
  async get(id: string): Promise<Response<SandboxDTO>> {
    return this.http.request<SandboxDTO>('get', `/sandboxes/${id}`);
  }

  /**
   * Create a sandbox. Sizes left out take the defaults; it starts on its own.
   */
  async create(data: CreateSandboxRequest): Promise<Response<SandboxDTO>> {
    return this.http.request<SandboxDTO>('post', '/sandboxes', { data });
  }

  /**
   * Start a stopped sandbox. Its disk is new; its remote is the same.
   */
  async start(id: string): Promise<Response<SandboxDTO>> {
    return this.http.request<SandboxDTO>('post', `/sandboxes/${id}/start`);
  }

  /**
   * Stop a sandbox. The record and its remote stay.
   */
  async stop(id: string): Promise<Response<SandboxDTO>> {
    return this.http.request<SandboxDTO>('post', `/sandboxes/${id}/stop`);
  }

  /**
   * Stop a sandbox, then remove the record and its remote
   */
  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/sandboxes/${id}`);
  }

  /**
   * Run a command on a running sandbox and wait for it (up to
   * `waitSeconds`, default 60). Returns the run with the last MiB of stdout
   * and stderr; `done` is false when it is still running.
   */
  async exec(id: string, command: string, options: SandboxExecOptions = {}): Promise<SandboxExecResult> {
    const sandbox = (await this.get(id)).data;
    if (!sandbox.remote_id) {
      throw new Error(`sandbox ${id} has no remote yet; wait until it is running`);
    }
    const wait = options.waitSeconds ?? 60;
    const res = await this.http.request<SandboxExecResult>('post', `/remotes/${encodeURIComponent(sandbox.remote_id)}/execs`, {
      params: { wait },
      data: { command, args: options.args, cwd: options.cwd, env: options.env, timeout_ms: options.timeoutMs },
    });
    return res.data;
  }

  /** List the directory at an absolute path on a running sandbox. */
  async listFiles(id: string, path: string): Promise<Response<SandboxFileEntry[]>> {
    return this.http.request<SandboxFileEntry[]>('get', filesPath(id, '', path));
  }

  /** Read a file (at most 8 MiB) from a running sandbox. */
  async readFile(id: string, path: string): Promise<Uint8Array> {
    const res = await this.http.fetch(filesPath(id, '/content', path));
    return new Uint8Array(await res.arrayBuffer());
  }

  /** Read a text file from a running sandbox. */
  async readTextFile(id: string, path: string): Promise<string> {
    return new TextDecoder().decode(await this.readFile(id, path));
  }

  /** Write a file (at most 4 MiB) on a running sandbox, making its directory. */
  async writeFile(id: string, path: string, content: Uint8Array | string): Promise<void> {
    const body = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    await this.http.fetch(filesPath(id, '/content', path), {
      method: 'PUT',
      body: body as BodyInit,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  }

  /** Delete a file (not a directory) on a running sandbox. */
  async deleteFile(id: string, path: string): Promise<void> {
    await this.http.request<void>('delete', filesPath(id, '/content', path));
  }

  /** What the team may run now, and the sizes one sandbox may ask for. */
  async limits(): Promise<Response<SandboxLimits>> {
    return this.http.request<SandboxLimits>('get', '/sandboxes/limits');
  }
}
