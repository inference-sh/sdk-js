import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import {
  ArtifactDTO,
  ArtifactVersionDTO,
  ArtifactCreateRequest,
  ArtifactUpdateRequest,
  ArtifactPublishRequest,
  ArtifactContentResponse,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Artifacts API — small self-contained HTML/Markdown pages published to a
 * URL, versioned, permissioned, and shareable.
 */
export class ArtifactsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List artifacts with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<ArtifactDTO>>> {
    return this.http.request<CursorListResponse<ArtifactDTO>>('post', '/artifacts/list', { data: params });
  }

  /**
   * Get an artifact by ID or short ID
   */
  async get(id: string): Promise<Response<ArtifactDTO>> {
    return this.http.request<ArtifactDTO>('get', `/artifacts/${id}`);
  }

  /**
   * Get an artifact by namespace/name
   */
  async getByName(namespace: string, name: string): Promise<Response<ArtifactDTO>> {
    return this.http.request<ArtifactDTO>('get', `/artifacts/${namespace}/${name}`);
  }

  /**
   * Publish an artifact. Creates it, or publishes a new version when an
   * artifact with the same name already exists in your namespace.
   */
  async publish(data: ArtifactCreateRequest): Promise<Response<ArtifactDTO>> {
    return this.http.request<ArtifactDTO>('post', '/artifacts', { data });
  }

  /**
   * Update metadata (title, description, favicon, shared version pin)
   */
  async update(id: string, data: ArtifactUpdateRequest): Promise<Response<ArtifactDTO>> {
    return this.http.request<ArtifactDTO>('post', `/artifacts/${id}`, { data });
  }

  /**
   * Publish a new version of an existing artifact
   */
  async publishVersion(id: string, data: ArtifactPublishRequest): Promise<Response<ArtifactDTO>> {
    return this.http.request<ArtifactDTO>('post', `/artifacts/${id}/versions`, { data });
  }

  /**
   * Delete an artifact
   */
  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/artifacts/${id}`);
  }

  /**
   * List versions (newest first)
   */
  async listVersions(id: string, params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<ArtifactVersionDTO>>> {
    return this.http.request<CursorListResponse<ArtifactVersionDTO>>('post', `/artifacts/${id}/versions/list`, { data: params });
  }

  /**
   * Get version metadata (md5, size, hash — no body)
   */
  async getVersion(id: string, versionId: string): Promise<Response<ArtifactVersionDTO>> {
    return this.http.request<ArtifactVersionDTO>('get', `/artifacts/${id}/versions/${versionId}`);
  }

  /**
   * Get the page source. Omit versionId for the viewer-facing version.
   */
  async getContent(id: string, versionId?: string): Promise<Response<ArtifactContentResponse>> {
    const path = versionId ? `/artifacts/${id}/versions/${versionId}/content` : `/artifacts/${id}/content`;
    return this.http.request<ArtifactContentResponse>('get', path);
  }

  /**
   * Pin the version viewers see. Pass an empty string to always share latest.
   */
  async setSharedVersion(id: string, versionId: string): Promise<Response<ArtifactDTO>> {
    return this.http.request<ArtifactDTO>('post', `/artifacts/${id}`, { data: { shared_version_id: versionId } });
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(id: string, newTeamId: string): Promise<Response<ArtifactDTO>> {
    return this.http.request<ArtifactDTO>('post', `/artifacts/${id}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Update visibility (private, team, org, unlisted, public)
   */
  async updateVisibility(id: string, visibility: string): Promise<Response<ArtifactDTO>> {
    return this.http.request<ArtifactDTO>('post', `/artifacts/${id}/visibility`, { data: { visibility } });
  }

  /**
   * URL of the rendered page (wrapped document under the artifact CSP).
   * Fetch it with credentials and load into a sandboxed iframe via srcdoc.
   */
  renderUrl(id: string, options?: { versionId?: string; theme?: 'dark' | 'light' }): string {
    const params = new URLSearchParams();
    if (options?.versionId) params.set('version', options.versionId);
    if (options?.theme) params.set('theme', options.theme);
    const qs = params.toString();
    return `${this.http.getBaseUrl()}/artifacts/${id}/render${qs ? `?${qs}` : ''}`;
  }
}
