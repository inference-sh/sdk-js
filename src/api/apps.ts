import { HttpClient } from '../http/client';
import {
  AppDTO as App,
  AppVersionDTO,
  CursorListRequest,
  CursorListResponse,
  LicenseRecordDTO
} from '../types';

/**
 * Apps API
 */
export class AppsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List apps with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<App>> {
    return this.http.request<CursorListResponse<App>>('post', '/apps/list', { data: params });
  }

  /**
   * Get an app by ID
   */
  async get(appId: string): Promise<App> {
    return this.http.requestEnveloped<App>('get', `/apps/${appId}`);
  }

  /**
   * Get an app by version ID
   */
  async getByVersionId(appId: string, versionId: string): Promise<App> {
    return this.http.requestEnveloped<App>('get', `/apps/${appId}/versions/${versionId}`);
  }

  /**
   * Create a new app
   */
  async create(data: Partial<App>): Promise<App> {
    return this.http.requestEnveloped<App>('post', '/apps', { data });
  }

  /**
   * Update an app
   */
  async update(appId: string, data: Partial<App>): Promise<App> {
    return this.http.requestEnveloped<App>('post', `/apps/${appId}`, { data });
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
    return this.http.requestEnveloped<CursorListResponse<AppVersionDTO>>('post', `/apps/${appId}/versions/list`, { data: params });
  }

  /**
   * Transfer app ownership to another team
   */
  async transferOwnership(appId: string, newTeamId: string): Promise<App> {
    return this.http.request<App>('post', `/apps/${appId}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Update app visibility
   */
  async updateVisibility(appId: string, visibility: string): Promise<App> {
    return this.http.request<App>('post', `/apps/${appId}/visibility`, { data: { visibility } });
  }

  /**
   * Get an app by namespace and name (e.g., "inference/claude-haiku")
   */
  async getByName(name: string): Promise<App> {
    return this.http.request<App>('get', `/apps/${name}`);
  }

  /**
   * Get app license record
   */
  async getLicense(appId: string): Promise<LicenseRecordDTO> {
    return this.http.requestEnveloped<LicenseRecordDTO>('get', `/apps/${appId}/license`);
  }

  /**
   * Save app license
   */
  async saveLicense(appId: string, license: string): Promise<LicenseRecordDTO> {
    return this.http.request<LicenseRecordDTO>('post', `/apps/${appId}/license`, { data: { license } });
  }

  /**
   * Set the current (active) version of an app
   */
  async setCurrentVersion(appId: string, versionId: string): Promise<App> {
    return this.http.request<App>('put', `/apps/${appId}/versions/${versionId}/current`);
  }
}

export function createAppsAPI(http: HttpClient): AppsAPI {
  return new AppsAPI(http);
}
