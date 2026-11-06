import { HttpClient } from '../http/client.js';
import type { Response } from '../http/response.js';
import {
  CreateSandboxRequest,
  CursorListRequest,
  CursorListResponse,
  SandboxDTO,
} from '../types.js';

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
}
