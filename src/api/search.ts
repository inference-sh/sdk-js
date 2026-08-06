import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import {
  SuggestRequest,
  SuggestResponse,
} from '../types';

/**
 * Search API
 */
export class SearchAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * Unified search across skills, knowledge, and apps
   */
  async suggest(params: Partial<SuggestRequest>): Promise<Response<SuggestResponse>> {
    return this.http.request<SuggestResponse>('post', '/suggest', { data: params });
  }

  /**
   * Full-text search via Meilisearch
   */
  async search(params: { q: string; type?: string; limit?: number }): Promise<Response<unknown>> {
    return this.http.request<unknown>('post', '/search', { data: params });
  }
}
