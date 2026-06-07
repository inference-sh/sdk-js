import { HttpClient } from '../http/client';
import {
  FlowRunDTO as FlowRun,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Flow Runs API
 */
export class FlowRunsAPI {
  constructor(private readonly http: HttpClient) {}

  /**
   * List flow runs with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<FlowRun>> {
    return this.http.request<CursorListResponse<FlowRun>>('post', '/flow-runs/list', { data: params });
  }

  /**
   * Get a flow run by ID
   */
  async get(flowRunId: string): Promise<FlowRun> {
    return this.http.request<FlowRun>('get', `/flow-runs/${flowRunId}`);
  }

  /**
   * Create a new flow run
   */
  async create(flowId: string, input?: unknown): Promise<FlowRun> {
    return this.http.request<FlowRun>('post', `/flows/${flowId}/runs`, { data: { input } });
  }

  /**
   * Clone a flow run
   */
  async clone(flowRunId: string): Promise<FlowRun> {
    return this.http.request<FlowRun>('post', `/flow-runs/${flowRunId}/clone`);
  }

  /**
   * Update a flow run
   */
  async update(flowRunId: string, data: Partial<FlowRun>): Promise<FlowRun> {
    return this.http.request<FlowRun>('put', `/flow-runs/${flowRunId}`, { data });
  }

  /**
   * Cancel a flow run
   */
  async cancel(flowRunId: string): Promise<void> {
    return this.http.request<void>('post', `/flow-runs/${flowRunId}/cancel`);
  }

  /**
   * Delete a flow run
   */
  async delete(flowRunId: string): Promise<void> {
    return this.http.request<void>('delete', `/flow-runs/${flowRunId}`);
  }

  /**
   * Stream flow run updates
   */
  stream(flowRunId: string) {
    return this.http.createEventSource(`/flow-runs/${flowRunId}/stream`);
  }

  /**
   * Update flow run visibility
   */
  async updateVisibility(flowRunId: string, visibility: string): Promise<FlowRun> {
    return this.http.request<FlowRun>('put', `/flow-runs/${flowRunId}/visibility`, { data: { visibility } });
  }
}

export function createFlowRunsAPI(http: HttpClient): FlowRunsAPI {
  return new FlowRunsAPI(http);
}
