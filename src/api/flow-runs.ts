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
    return this.http.request<CursorListResponse<FlowRun>>('get', '/flow-runs', { params: params as Record<string, unknown> });
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
   * Delete a flow run
   */
  async delete(flowRunId: string): Promise<void> {
    return this.http.request<void>('delete', `/flow-runs/${flowRunId}`);
  }
}

export function createFlowRunsAPI(http: HttpClient): FlowRunsAPI {
  return new FlowRunsAPI(http);
}
