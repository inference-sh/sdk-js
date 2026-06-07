import { HttpClient } from '../http/client';
import {
  KnowledgeDTO,
  KnowledgeVersionDTO,
  KnowledgeCreateRequest,
  SkillDTO,
  SkillVersionDTO,
  CursorListRequest,
  CursorListResponse,
  PublicSkillStoreDTO,
} from '../types';

/**
 * Knowledge API
 */
export class KnowledgeAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List knowledge entries with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<KnowledgeDTO>> {
    return this.http.request<CursorListResponse<KnowledgeDTO>>('post', '/knowledge/list', { data: params });
  }

  /**
   * Get a knowledge entry by ID
   */
  async get(id: string): Promise<KnowledgeDTO> {
    return this.http.request<KnowledgeDTO>('get', `/knowledge/${id}`);
  }

  /**
   * Get a knowledge entry by namespace/name
   */
  async getByName(namespace: string, name: string): Promise<KnowledgeDTO> {
    return this.http.request<KnowledgeDTO>('get', `/knowledge/${namespace}/${name}`);
  }

  /**
   * Create a knowledge entry
   */
  async create(data: KnowledgeCreateRequest): Promise<KnowledgeDTO> {
    return this.http.request<KnowledgeDTO>('post', '/knowledge', { data });
  }

  /**
   * Update a knowledge entry
   */
  async update(id: string, data: Partial<KnowledgeDTO>): Promise<KnowledgeDTO> {
    return this.http.request<KnowledgeDTO>('post', `/knowledge/${id}`, { data });
  }

  /**
   * Delete a knowledge entry
   */
  async delete(id: string): Promise<void> {
    return this.http.request<void>('delete', `/knowledge/${id}`);
  }

  /**
   * List knowledge versions
   */
  async listVersions(id: string, params?: Partial<CursorListRequest>): Promise<CursorListResponse<KnowledgeVersionDTO>> {
    return this.http.request<CursorListResponse<KnowledgeVersionDTO>>('post', `/knowledge/${id}/versions/list`, { data: params });
  }

  /**
   * Get a specific version
   */
  async getVersion(id: string, versionId: string): Promise<KnowledgeVersionDTO> {
    return this.http.request<KnowledgeVersionDTO>('get', `/knowledge/${id}/versions/${versionId}`);
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(id: string, newTeamId: string): Promise<KnowledgeDTO> {
    return this.http.request<KnowledgeDTO>('post', `/knowledge/${id}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Update visibility
   */
  async updateVisibility(id: string, visibility: string): Promise<KnowledgeDTO> {
    return this.http.request<KnowledgeDTO>('post', `/knowledge/${id}/visibility`, { data: { visibility } });
  }
}

/**
 * Skills API
 */
export class SkillsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List skills with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<SkillDTO>> {
    return this.http.request<CursorListResponse<SkillDTO>>('post', '/skills/list', { data: params });
  }

  /**
   * Get a skill by ID
   */
  async get(id: string): Promise<SkillDTO> {
    return this.http.request<SkillDTO>('get', `/skills/${id}`);
  }

  /**
   * Get a skill by namespace/name
   */
  async getByName(namespace: string, name: string): Promise<SkillDTO> {
    return this.http.request<SkillDTO>('get', `/skills/${namespace}/${name}`);
  }

  /**
   * Resolve a skill (store + GitHub fallback)
   */
  async resolve(ref: string, skill?: string): Promise<unknown> {
    const params: Record<string, string> = { ref };
    if (skill) params.skill = skill;
    return this.http.request<unknown>('get', '/skills/resolve', { params });
  }

  /**
   * Create/publish a skill
   */
  async create(data: Partial<SkillDTO>): Promise<SkillDTO> {
    return this.http.request<SkillDTO>('post', '/skills', { data });
  }

  /**
   * Update a skill
   */
  async update(id: string, data: Partial<SkillDTO>): Promise<SkillDTO> {
    return this.http.request<SkillDTO>('post', `/skills/${id}`, { data });
  }

  /**
   * Delete a skill
   */
  async delete(id: string): Promise<void> {
    return this.http.request<void>('delete', `/skills/${id}`);
  }

  /**
   * List skill versions
   */
  async listVersions(id: string, params?: Partial<CursorListRequest>): Promise<CursorListResponse<SkillVersionDTO>> {
    return this.http.request<CursorListResponse<SkillVersionDTO>>('post', `/skills/${id}/versions/list`, { data: params });
  }

  /**
   * Get a specific skill version
   */
  async getVersion(id: string, versionId: string): Promise<SkillVersionDTO> {
    return this.http.request<SkillVersionDTO>('get', `/skills/${id}/versions/${versionId}`);
  }

  /**
   * Download a skill
   */
  async download(namespace: string, name: string): Promise<unknown> {
    return this.http.request<unknown>('get', `/skills/${namespace}/${name}/download`);
  }

  /**
   * Get skill content
   */
  async getContent(namespace: string, name: string): Promise<unknown> {
    return this.http.request<unknown>('get', `/skills/${namespace}/${name}/content`);
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(id: string, newTeamId: string): Promise<SkillDTO> {
    return this.http.request<SkillDTO>('post', `/skills/${id}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Update visibility
   */
  async updateVisibility(id: string, visibility: string): Promise<SkillDTO> {
    return this.http.request<SkillDTO>('post', `/skills/${id}/visibility`, { data: { visibility } });
  }

  /**
   * List skills in the public store
   */
  async listStore(params?: Partial<CursorListRequest>): Promise<CursorListResponse<PublicSkillStoreDTO>> {
    return this.http.request<CursorListResponse<PublicSkillStoreDTO>>('post', '/store/skills/list', { data: params });
  }
}
