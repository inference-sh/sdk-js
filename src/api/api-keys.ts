import { HttpClient } from '../http/client.js';
import type { Response } from '../http/response.js';
import {
  ApiKeyDTO,
  CreateApiKeyRequest,
  CursorListRequest,
  CursorListResponse,
} from '../types.js';

/**
 * API Keys API
 */
export class ApiKeysAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List API keys with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<ApiKeyDTO>>> {
    return this.http.request<CursorListResponse<ApiKeyDTO>>('post', '/apikeys/list', { data: params });
  }

  /**
   * Create an API key
   */
  async create(data: CreateApiKeyRequest): Promise<Response<ApiKeyDTO>> {
    return this.http.request<ApiKeyDTO>('post', '/apikeys', { data });
  }

  /**
   * Delete an API key
   */
  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/apikeys/${id}`);
  }
}
