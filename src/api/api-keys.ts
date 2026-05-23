import { HttpClient } from '../http/client';
import {
  ApiKeyDTO,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * API Keys API
 */
export class ApiKeysAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List API keys with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<ApiKeyDTO>> {
    return this.http.request<CursorListResponse<ApiKeyDTO>>('post', '/apikeys/list', { data: params });
  }

  /**
   * Create an API key
   */
  async create(data: { name: string; scopes?: string[] }): Promise<ApiKeyDTO> {
    return this.http.request<ApiKeyDTO>('post', '/apikeys', { data });
  }

  /**
   * Delete an API key
   */
  async delete(id: string): Promise<void> {
    return this.http.request<void>('delete', `/apikeys/${id}`);
  }
}
