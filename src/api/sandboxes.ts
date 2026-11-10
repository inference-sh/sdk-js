import { HttpClient } from '../http/client.js';
import type { Response } from '../http/response.js';
import { InferenceError } from '../http/errors.js';
import type { FilesAPI } from './files.js';
import {
  CreateSandboxRequest,
  CursorListRequest,
  CursorListResponse,
  FileDTO as File,
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
  run: SandboxExecRun;
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
  /** How long to wait for it to finish, whole seconds from 1 to 600. Default 60. */
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

/**
 * An import or an export: the path on the box, its size in bytes, the
 * platform file on the other side and, for an export, a short-lived URL
 * that downloads it.
 */
export interface SandboxFileTransfer {
  path: string;
  size: number;
  file?: File;
  download_url?: string;
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

/** The longest {@link SandboxExecOptions.waitSeconds} the API holds a request. */
const EXEC_WAIT_MAX = 600;

const filesPath = (id: string, path: string) =>
  `/sandboxes/${encodeURIComponent(id)}/files?path=${encodeURIComponent(path)}`;

/**
 * A held answer's result, or the problem body that came under its 200:
 * past the API's heartbeat (25 s) the status is sent before the outcome.
 */
function heldResult<T>(data: unknown, ok: (v: Record<string, unknown>) => boolean, what: string): T {
  const v = (data ?? {}) as Record<string, unknown>;
  if (data && ok(v)) {
    return data as T;
  }
  const status = typeof v.status === 'number' ? v.status : 502;
  const detail = (v.detail || v.title || v.message || `${what} answered no result`) as string;
  throw new InferenceError(status, detail, JSON.stringify(data ?? null));
}

/**
 * Sandboxes API
 *
 * A sandbox is a box on one of our engines that runs belt and connects back
 * as a remote. The owner sets what it should be (running, stopped, deleted);
 * start, stop and delete answer at once and the status follows.
 */
export class SandboxesAPI {
  /** files uploads and deletes the storage copy writeFile and readFile move bytes through. */
  constructor(private readonly http: HttpClient, private readonly files?: FilesAPI) { }

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
    const wait = options.waitSeconds ?? 60;
    // 0 would answer the bare run, not a result: the API waits only for 1 or more.
    if (!Number.isInteger(wait) || wait < 1 || wait > EXEC_WAIT_MAX) {
      throw new RangeError(`waitSeconds is whole seconds from 1 to ${EXEC_WAIT_MAX}, not ${wait}`);
    }
    const sandbox = (await this.get(id)).data;
    if (sandbox.status !== 'running') {
      throw new Error(`sandbox ${id} is ${sandbox.status}, not running; start it first`);
    }
    if (!sandbox.remote_id) {
      throw new Error(`sandbox ${id} has no remote yet; wait until it is running`);
    }
    const res = await this.http.request<SandboxExecResult>('post', `/remotes/${encodeURIComponent(sandbox.remote_id)}/execs`, {
      params: { wait },
      data: { command, args: options.args, cwd: options.cwd, env: options.env, timeout_ms: options.timeoutMs },
    });
    return heldResult<SandboxExecResult>(res.data, (v) => typeof v.done === 'boolean' && !!v.run, 'the exec wait');
  }

  /** List the directory at an absolute path on a running sandbox. */
  async listFiles(id: string, path: string): Promise<Response<SandboxFileEntry[]>> {
    return this.http.request<SandboxFileEntry[]>('get', filesPath(id, path));
  }

  /** Delete a file (not a directory) on a running sandbox. */
  async deleteFile(id: string, path: string): Promise<void> {
    await this.http.request<void>('delete', filesPath(id, path));
  }

  /**
   * Have a running sandbox download a platform file (see `files.upload`) to
   * an absolute path. The bytes go from storage to the box directly.
   */
  async importFile(id: string, path: string, fileId: string): Promise<SandboxFileTransfer> {
    const res = await this.http.request<SandboxFileTransfer>('post', `/sandboxes/${encodeURIComponent(id)}/files/import`, {
      data: { path, file_id: fileId },
    });
    return heldResult<SandboxFileTransfer>(res.data, (v) => typeof v.path === 'string', 'the import');
  }

  /**
   * Have a running sandbox upload the file at an absolute path into a new
   * platform file of yours; `download_url` fetches it for 15 minutes.
   */
  async exportFile(id: string, path: string): Promise<SandboxFileTransfer> {
    const res = await this.http.request<SandboxFileTransfer>('post', `/sandboxes/${encodeURIComponent(id)}/files/export`, {
      data: { path },
    });
    return heldResult<SandboxFileTransfer>(res.data, (v) => typeof v.path === 'string', 'the export');
  }

  /**
   * Read a file from a running sandbox. It goes through your file storage
   * (an export, then a download); the storage copy is deleted after.
   */
  async readFile(id: string, path: string): Promise<Uint8Array> {
    const t = await this.exportFile(id, path);
    try {
      if (!t.download_url) {
        throw new Error(`the export of ${path} returned no download URL`);
      }
      const res = await fetch(t.download_url);
      if (!res.ok) {
        throw new Error(`downloading ${path} from storage: HTTP ${res.status}`);
      }
      return new Uint8Array(await res.arrayBuffer());
    } finally {
      if (t.file?.id && this.files) {
        await this.files.delete(t.file.id).catch(() => undefined);
      }
    }
  }

  /** Read a UTF-8 text file from a running sandbox; a leading BOM is kept. */
  async readTextFile(id: string, path: string): Promise<string> {
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(await this.readFile(id, path));
  }

  /**
   * Write a file on a running sandbox, making its directory. It goes
   * through your file storage (an upload, then an import), so it can be as
   * large as one upload; the storage copy is deleted after. Storage takes
   * no empty upload: make an empty file with {@link exec} (`touch`).
   */
  async writeFile(id: string, path: string, content: Uint8Array | string | Blob): Promise<SandboxFileTransfer> {
    if (!this.files) {
      throw new Error('writeFile needs the files API: use the client\'s sandboxes, not a bare SandboxesAPI');
    }
    const blob = content instanceof Blob ? content : new Blob([typeof content === 'string' ? new TextEncoder().encode(content) : content as BlobPart]);
    if (blob.size === 0) {
      throw new RangeError(`${path}: an empty file is not uploaded; make it with exec('touch')`);
    }
    const name = path.split('/').pop() || 'file';
    const file = await this.files.upload(blob, { filename: name });
    try {
      return await this.importFile(id, path, file.id);
    } finally {
      await this.files.delete(file.id).catch(() => undefined);
    }
  }

  /** What the team may run now, and the sizes one sandbox may ask for. */
  async limits(): Promise<Response<SandboxLimits>> {
    return this.http.request<SandboxLimits>('get', '/sandboxes/limits');
  }
}
