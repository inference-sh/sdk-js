import { HttpClient } from '../http/client';
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
  async suggest(params: Partial<SuggestRequest>): Promise<SuggestResponse> {
    return this.http.request<SuggestResponse>('post', '/suggest', { data: params });
  }

  /**
   * Full-text search via Meilisearch
   */
  async search(params: { q: string; type?: string; limit?: number }): Promise<unknown> {
    return this.http.request<unknown>('post', '/search', { data: params });
  }
}
