import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import type { ProjectWriteBody } from './write-bodies';
import {
  ProjectDTO,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Projects API
 */
export class ProjectsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List projects with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<ProjectDTO>>> {
    return this.http.request<CursorListResponse<ProjectDTO>>('post', '/projects/list', { data: params });
  }

  /**
   * Get a project by ID
   */
  async get(id: string): Promise<Response<ProjectDTO>> {
    return this.http.request<ProjectDTO>('get', `/projects/${id}`);
  }

  /**
   * Create a project
   */
  async create(data: ProjectWriteBody): Promise<Response<ProjectDTO>> {
    return this.http.request<ProjectDTO>('post', '/projects', { data });
  }

  /**
   * Update a project
   */
  async update(id: string, data: ProjectWriteBody): Promise<Response<ProjectDTO>> {
    return this.http.request<ProjectDTO>('post', `/projects/${id}`, { data });
  }

  /**
   * Delete a project
   */
  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/projects/${id}`);
  }
}
