import { HttpClient } from '../http/client';
import {
  AppDTO as App,
  AppVersionDTO,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Apps API
 */
export class AppsAPI {
  constructor(private readonly http: HttpClient) {}

  /**
   * List apps with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<App>> {
    return this.http.request<CursorListResponse<App>>('get', '/apps', { params: params });
  }

  /**
   * Get an app by ID
   */
  async get(appId: string): Promise<App> {
    return this.http.request<App>('get', `/apps/${appId}`);
  }

  /**
   * Get an app by version ID
   */
  async getByVersionId(appId: string, versionId: string): Promise<App> {
    return this.http.request<App>('get', `/apps/${appId}/versions/${versionId}`);
  }

  /**
   * Create a new app
   */
  async create(data: Partial<App>): Promise<App> {
    return this.http.request<App>('post', '/apps', { data });
  }

  /**
   * Update an app
   */
  async update(appId: string, data: Partial<App>): Promise<App> {
    return this.http.request<App>('put', `/apps/${appId}`, { data });
  }

  /**
   * Delete an app
   */
  async delete(appId: string): Promise<void> {
    return this.http.request<void>('delete', `/apps/${appId}`);
  }

  /**
   * Duplicate an app
   */
  async duplicate(appId: string): Promise<App> {
    return this.http.request<App>('post', `/apps/${appId}/duplicate`);
  }

  /**
   * List app versions
   */
  async listVersions(appId: string, params?: Partial<CursorListRequest>): Promise<CursorListResponse<AppVersionDTO>> {
    return this.http.request<CursorListResponse<AppVersionDTO>>('get', `/apps/${appId}/versions`, { params: params });
  }

  /**
   * Transfer app ownership to another team
   */
  async transferOwnership(appId: string, newTeamId: string): Promise<App> {
    return this.http.request<App>('post', `/apps/${appId}/transfer`, { data: { team_id: newTeamId } });
  }
}

export function createAppsAPI(http: HttpClient): AppsAPI {
  return new AppsAPI(http);
}
