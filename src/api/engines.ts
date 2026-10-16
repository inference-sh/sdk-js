import { HttpClient } from '../http/client.js';
import type { Response } from '../http/response.js';
import type { EngineUpdateBody } from './write-bodies.js';
import {
  EngineDTO as Engine,
  EngineReleasesResponse,
  EngineUpdateRequest,
  CursorListRequest,
  CursorListResponse,
} from '../types.js';

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
   * Rename an engine (see EngineUpdateBody). PATCH: only the fields sent are
   * written.
   */
  async update(engineId: string, data: EngineUpdateBody): Promise<Response<Engine>> {
    return this.http.request<Engine>('patch', `/engines/${engineId}`, { data });
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
   * Update an engine binary: it drains, installs the release and restarts.
   * `version` is "stable" (the default: newest stable, lifting any pin),
   * "canary" (the current canary build, pinned), or a version such as
   * v1.9.3 (pinned). A pinned engine stays on its version until sent
   * "stable" again.
   */
  async updateBinary(engineId: string, version?: string): Promise<Response<void>> {
    const body: EngineUpdateRequest = version ? { version } : {};
    return this.http.request<void>('post', `/engines/${engineId}/update`, { data: body });
  }

  /**
   * The head of each engine release channel (stable, canary) on dist.inference.sh.
   */
  async releases(): Promise<Response<EngineReleasesResponse>> {
    return this.http.request<EngineReleasesResponse>('get', '/engines/releases');
  }
}

export function createEnginesAPI(http: HttpClient): EnginesAPI {
  return new EnginesAPI(http);
}
