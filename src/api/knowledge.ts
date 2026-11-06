import { HttpClient } from '../http/client.js';
import type { Response } from '../http/response.js';
import type { KnowledgeUpdateBody } from './write-bodies.js';
import {
  KnowledgeDTO,
  KnowledgeVersionDTO,
  KnowledgeCreateRequest,
  SkillDTO,
  SkillVersionDTO,
  CursorListRequest,
  CursorListResponse,
  PublicSkillStoreDTO,
} from '../types.js';

/**
 * Knowledge API
 */
export class KnowledgeAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List knowledge entries with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<KnowledgeDTO>>> {
    return this.http.request<CursorListResponse<KnowledgeDTO>>('post', '/knowledge/list', { data: params });
  }

  /**
   * Get a knowledge entry by ID
   */
  async get(id: string): Promise<Response<KnowledgeDTO>> {
    return this.http.request<KnowledgeDTO>('get', `/knowledge/${id}`);
  }

  /**
   * Get a knowledge entry by namespace/name
   */
  async getByName(namespace: string, name: string): Promise<Response<KnowledgeDTO>> {
    return this.http.request<KnowledgeDTO>('get', `/knowledge/${namespace}/${name}`);
  }

  /**
   * Create a knowledge entry
   */
  async create(data: KnowledgeCreateRequest): Promise<Response<KnowledgeDTO>> {
    return this.http.request<KnowledgeDTO>('post', '/knowledge', { data });
  }

  /**
   * Update a knowledge entry (PATCH): only the fields sent are written, the
   * others keep their value.
   */
  async update(id: string, data: KnowledgeUpdateBody): Promise<Response<KnowledgeDTO>> {
    return this.http.request<KnowledgeDTO>('patch', `/knowledge/${id}`, { data });
  }

  /**
   * Delete a knowledge entry
   */
  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/knowledge/${id}`);
  }

  /**
   * List knowledge versions
   */
  async listVersions(id: string, params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<KnowledgeVersionDTO>>> {
    return this.http.request<CursorListResponse<KnowledgeVersionDTO>>('post', `/knowledge/${id}/versions/list`, { data: params });
  }

  /**
   * Get a specific version
   */
  async getVersion(id: string, versionId: string): Promise<Response<KnowledgeVersionDTO>> {
    return this.http.request<KnowledgeVersionDTO>('get', `/knowledge/${id}/versions/${versionId}`);
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(id: string, newTeamId: string): Promise<Response<KnowledgeDTO>> {
    return this.http.request<KnowledgeDTO>('post', `/knowledge/${id}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Update visibility
   */
  async updateVisibility(id: string, visibility: string): Promise<Response<KnowledgeDTO>> {
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
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<SkillDTO>>> {
    return this.http.request<CursorListResponse<SkillDTO>>('post', '/skills/list', { data: params });
  }

  /**
   * Get a skill by ID
   */
  async get(id: string): Promise<Response<SkillDTO>> {
    return this.http.request<SkillDTO>('get', `/skills/${id}`);
  }

  /**
   * Get a skill by namespace/name
   */
  async getByName(namespace: string, name: string): Promise<Response<SkillDTO>> {
    return this.http.request<SkillDTO>('get', `/skills/${namespace}/${name}`);
  }

  /**
   * Resolve a skill (store + GitHub fallback)
   */
  async resolve(ref: string, skill?: string): Promise<Response<unknown>> {
    const params: Record<string, string> = { ref };
    if (skill) params.skill = skill;
    return this.http.request<unknown>('get', '/skills/resolve', { params });
  }

  /**
   * Create/publish a skill
   */
  async create(data: Partial<SkillDTO>): Promise<Response<SkillDTO>> {
    return this.http.request<SkillDTO>('post', '/skills', { data });
  }

  /**
   * Update a skill (PATCH): only the fields sent are written, the others
   * keep their value.
   */
  async update(id: string, data: KnowledgeUpdateBody): Promise<Response<SkillDTO>> {
    return this.http.request<SkillDTO>('patch', `/skills/${id}`, { data });
  }

  /**
   * Delete a skill
   */
  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/skills/${id}`);
  }

  /**
   * List skill versions
   */
  async listVersions(id: string, params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<SkillVersionDTO>>> {
    return this.http.request<CursorListResponse<SkillVersionDTO>>('post', `/skills/${id}/versions/list`, { data: params });
  }

  /**
   * Get a specific skill version
   */
  async getVersion(id: string, versionId: string): Promise<Response<SkillVersionDTO>> {
    return this.http.request<SkillVersionDTO>('get', `/skills/${id}/versions/${versionId}`);
  }

  /**
   * Download a skill
   */
  async download(namespace: string, name: string): Promise<Response<unknown>> {
    return this.http.request<unknown>('get', `/skills/${namespace}/${name}/download`);
  }

  /**
   * Get a skill's SKILL.md. The API answers with the markdown itself.
   */
  async getContent(namespace: string, name: string): Promise<Response<string>> {
    const response = await this.http.fetch(`/skills/${namespace}/${name}/content`);
    return { data: await response.text(), messages: [] };
  }

  /**
   * Get one of a skill's files by its path in the skill (e.g. "scripts/run.sh").
   */
  async getFile(namespace: string, name: string, path: string): Promise<Response<string>> {
    const filePath = path.split('/').map(encodeURIComponent).join('/');
    const response = await this.http.fetch(`/skills/${namespace}/${name}/files/${filePath}`);
    return { data: await response.text(), messages: [] };
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(id: string, newTeamId: string): Promise<Response<SkillDTO>> {
    return this.http.request<SkillDTO>('post', `/skills/${id}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Update visibility
   */
  async updateVisibility(id: string, visibility: string): Promise<Response<SkillDTO>> {
    return this.http.request<SkillDTO>('post', `/skills/${id}/visibility`, { data: { visibility } });
  }

  /**
   * List skills in the public store
   */
  async listStore(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<PublicSkillStoreDTO>>> {
    return this.http.request<CursorListResponse<PublicSkillStoreDTO>>('post', '/store/skills/list', { data: params });
  }
}
