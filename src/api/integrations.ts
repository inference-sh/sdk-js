import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import {
  IntegrationDTO,
  IntegrationConfigDTO,
  IntegrationConnectRequest,
  IntegrationConnectResponse,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Integrations API
 */
export class IntegrationsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List integrations with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<IntegrationDTO>>> {
    return this.http.request<CursorListResponse<IntegrationDTO>>('post', '/credentials/list', { data: params });
  }

  /**
   * Get available integrations
   */
  async listAvailable(): Promise<Response<IntegrationConfigDTO[]>> {
    return this.http.request<IntegrationConfigDTO[]>('get', '/credentials/available');
  }

  /**
   * Get integration configs
   */
  async getConfigs(): Promise<Response<IntegrationConfigDTO[]>> {
    return this.http.request<IntegrationConfigDTO[]>('get', '/credentials/configs');
  }

  /**
   * Get capabilities
   */
  async getCapabilities(): Promise<Response<unknown>> {
    return this.http.request<unknown>('get', '/credentials/capabilities');
  }

  /**
   * Check requirements
   */
  async checkRequirements(data: unknown): Promise<Response<unknown>> {
    return this.http.request<unknown>('post', '/credentials/check', { data });
  }

  /**
   * Connect an integration
   */
  async connect(data: IntegrationConnectRequest): Promise<Response<IntegrationConnectResponse>> {
    return this.http.request<IntegrationConnectResponse>('post', '/credentials', { data });
  }

  /**
   * Get an integration by provider key
   */
  async get(provider: string): Promise<Response<IntegrationDTO>> {
    return this.http.request<IntegrationDTO>('get', `/credentials/${provider}`);
  }

  /**
   * Disconnect an integration
   */
  async disconnect(provider: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/credentials/${provider}`);
  }
}
