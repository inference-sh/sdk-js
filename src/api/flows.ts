import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import type { FlowPatchBody, FlowUpdateBody, FlowViewportBody } from './write-bodies';
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
  constructor(private readonly http: HttpClient) { }

  /**
   * List flows with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<Flow>>> {
    return this.http.request<CursorListResponse<Flow>>('post', '/flows/list', { data: params });
  }

  /**
   * Get a flow by ID
   */
  async get(flowId: string): Promise<Response<Flow>> {
    return this.http.request<Flow>('get', `/flows/${flowId}`);
  }

  /**
   * Create a new flow
   */
  async create(name: string): Promise<Response<Flow>> {
    return this.http.request<Flow>('post', '/flows', { data: { name } });
  }

  /**
   * Update a flow's copy and images, and save its draft graph when the body
   * names the draft (see FlowUpdateBody). A field left out is written
   * empty: to change some fields only, use patch.
   */
  async update(flowId: string, data: FlowUpdateBody): Promise<Response<Flow>> {
    return this.http.request<Flow>('post', `/flows/${flowId}`, { data });
  }

  /**
   * Change some of a flow's fields: only the fields sent are written.
   */
  async patch(flowId: string, data: FlowPatchBody): Promise<Response<Flow>> {
    return this.http.request<Flow>('patch', `/flows/${flowId}`, { data });
  }

  /**
   * Save where the editor's canvas looks on the flow's draft.
   */
  async saveViewport(flowId: string, viewport: FlowViewportBody): Promise<Response<void>> {
    return this.http.request<void>('post', `/flows/${flowId}/viewport`, { data: viewport });
  }

  /**
   * Update flow visibility
   */
  async updateVisibility(flowId: string, visibility: string): Promise<Response<Flow>> {
    return this.http.request<Flow>('post', `/flows/${flowId}/visibility`, { data: { visibility } });
  }

  /**
   * Delete a flow
   */
  async delete(flowId: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/flows/${flowId}`);
  }

  /**
   * Duplicate a flow
   */
  async duplicate(flowId: string): Promise<Response<Flow>> {
    return this.http.request<Flow>('post', `/flows/${flowId}/duplicate`);
  }

  /**
   * List flow versions
   */
  async listVersions(flowId: string, params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<FlowVersionDTO>>> {
    return this.http.request<CursorListResponse<FlowVersionDTO>>('post', `/flows/${flowId}/versions/list`, { data: params });
  }

  /**
   * Create an app from a flow
   */
  async createApp(flowId: string): Promise<Response<App>> {
    return this.http.request<App>('post', `/flows/${flowId}/app`);
  }

  /**
   * Transfer flow ownership to another team
   */
  async transferOwnership(flowId: string, newTeamId: string): Promise<Response<Flow>> {
    return this.http.request<Flow>('post', `/flows/${flowId}/transfer`, { data: { team_id: newTeamId } });
  }

  /**
   * Stream flow updates
   */
  stream(flowId: string) {
    return this.http.createEventSource(`/flows/${flowId}/stream`);
  }
}

export function createFlowsAPI(http: HttpClient): FlowsAPI {
  return new FlowsAPI(http);
}
