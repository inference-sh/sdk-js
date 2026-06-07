import { HttpClient } from '../http/client';
import {
  SecretDTO,
  SecretCreateRequest,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Secrets API
 */
export class SecretsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List secrets with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<SecretDTO>> {
    return this.http.request<CursorListResponse<SecretDTO>>('post', '/secrets/list', { data: params });
  }

  /**
   * Create a secret
   */
  async create(data: SecretCreateRequest): Promise<SecretDTO> {
    return this.http.request<SecretDTO>('post', '/secrets', { data });
  }

  /**
   * Update a secret
   */
  async update(key: string, data: Partial<SecretCreateRequest>): Promise<SecretDTO> {
    return this.http.request<SecretDTO>('put', `/secrets/${key}`, { data });
  }

  /**
   * Delete a secret
   */
  async delete(key: string): Promise<void> {
    return this.http.request<void>('delete', `/secrets/${key}`);
  }

  /**
   * Reveal a secret value
   */
  async reveal(key: string): Promise<SecretDTO> {
    return this.http.request<SecretDTO>('get', `/secrets/reveal/${key}`);
  }
}
