import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import {
  EngineDTO as Engine,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Engines API
 */
export class EnginesAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List engines with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<Engine>>> {
    return this.http.request<CursorListResponse<Engine>>('post', '/engines/list', { data: params });
  }

  /**
   * Get an engine by ID
   */
  async get(engineId: string): Promise<Response<Engine>> {
    return this.http.request<Engine>('get', `/engines/${engineId}`);
  }

  /**
   * Get engines for specific resources (apps/agents)
   */
  async getForResources(request: { app_ids?: string[]; agent_ids?: string[] }): Promise<Response<Engine[]>> {
    return this.http.request<Engine[]>('post', '/engines/resources', { data: request });
  }

  /**
   * Create a new engine
   */
  async create(data: Partial<Engine>): Promise<Response<Engine>> {
    return this.http.request<Engine>('post', '/engines', { data });
  }

  /**
   * Update an engine
   */
  async update(engineId: string, data: Partial<Engine>): Promise<Response<Engine>> {
    return this.http.request<Engine>('post', `/engines/${engineId}`, { data });
  }

  /**
   * Delete an engine
   */
  async delete(engineId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/engines/${engineId}`);
  }

  /**
   * Stream engine updates
   */
  stream(engineId: string) {
    return this.http.createEventSource(`/engines/${engineId}/stream`);
  }

  /**
   * Stop an engine
   */
  async stop(engineId: string): Promise<Response<void>> {
    return this.http.request<void>('post', `/engines/${engineId}/stop`);
  }

  /**
   * Restart an engine
   */
  async restart(engineId: string): Promise<Response<void>> {
    return this.http.request<void>('post', `/engines/${engineId}/restart`);
  }

  /**
   * Update engine visibility
   */
  async updateVisibility(engineId: string, visibility: string): Promise<Response<Engine>> {
    return this.http.request<Engine>('post', `/engines/${engineId}/visibility`, { data: { visibility } });
  }

  /**
   * Transfer engine ownership
   */
  async transferOwnership(engineId: string, newTeamId: string): Promise<Response<Engine>> {
    return this.http.request<Engine>('post', `/engines/${engineId}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Extend engine duration
   */
  async extend(engineId: string): Promise<Response<void>> {
    return this.http.request<void>('post', `/engines/${engineId}/extend`);
  }

  /**
   * Drain an engine
   */
  async drain(engineId: string): Promise<Response<void>> {
    return this.http.request<void>('post', `/engines/${engineId}/drain`);
  }

  /**
   * Update an engine binary (drain + restart with new version)
   */
  async updateBinary(engineId: string): Promise<Response<void>> {
    return this.http.request<void>('post', `/engines/${engineId}/update`);
  }
}

export function createEnginesAPI(http: HttpClient): EnginesAPI {
  return new EnginesAPI(http);
}
