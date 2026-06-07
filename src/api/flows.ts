import { HttpClient } from '../http/client';
import {
  FlowDTO as Flow,
  FlowVersionDTO,
  AppDTO as App,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Flows API
 */
export class FlowsAPI {
  constructor(private readonly http: HttpClient) {}

  /**
   * List flows with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<Flow>> {
    return this.http.request<CursorListResponse<Flow>>('get', '/flows', { params: params });
  }

  /**
   * Get a flow by ID
   */
  async get(flowId: string): Promise<Flow> {
    return this.http.request<Flow>('get', `/flows/${flowId}`);
  }

  /**
   * Create a new flow
   */
  async create(name: string): Promise<Flow> {
    return this.http.request<Flow>('post', '/flows', { data: { name } });
  }

  /**
   * Update a flow
   */
  async update(flowId: string, data: Partial<Flow>): Promise<Flow> {
    return this.http.request<Flow>('put', `/flows/${flowId}`, { data });
  }

  /**
   * Delete a flow
   */
  async delete(flowId: string): Promise<void> {
    return this.http.request<void>('delete', `/flows/${flowId}`);
  }

  /**
   * Duplicate a flow
   */
  async duplicate(flowId: string): Promise<Flow> {
    return this.http.request<Flow>('post', `/flows/${flowId}/duplicate`);
  }

  /**
   * List flow versions
   */
  async listVersions(flowId: string, params?: Partial<CursorListRequest>): Promise<CursorListResponse<FlowVersionDTO>> {
    return this.http.request<CursorListResponse<FlowVersionDTO>>('get', `/flows/${flowId}/versions`, { params: params });
  }

  /**
   * Create an app from a flow
   */
  async createApp(flowId: string): Promise<App> {
    return this.http.request<App>('post', `/flows/${flowId}/app`);
  }

  /**
   * Transfer flow ownership to another team
   */
  async transferOwnership(flowId: string, newTeamId: string): Promise<Flow> {
    return this.http.request<Flow>('post', `/flows/${flowId}/transfer`, { data: { team_id: newTeamId } });
  }
}

export function createFlowsAPI(http: HttpClient): FlowsAPI {
  return new FlowsAPI(http);
}
