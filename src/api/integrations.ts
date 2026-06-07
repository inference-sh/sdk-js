import { HttpClient } from '../http/client';
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
  async list(params?: Partial<CursorListRequest>): Promise<CursorListResponse<IntegrationDTO>> {
    return this.http.request<CursorListResponse<IntegrationDTO>>('post', '/integrations/list', { data: params });
  }

  /**
   * Get available integrations
   */
  async listAvailable(): Promise<IntegrationConfigDTO[]> {
    return this.http.request<IntegrationConfigDTO[]>('get', '/integrations/available');
  }

  /**
   * Get integration configs
   */
  async getConfigs(): Promise<IntegrationConfigDTO[]> {
    return this.http.request<IntegrationConfigDTO[]>('get', '/integrations/configs');
  }

  /**
   * Get capabilities
   */
  async getCapabilities(): Promise<unknown> {
    return this.http.request<unknown>('get', '/integrations/capabilities');
  }

  /**
   * Check requirements
   */
  async checkRequirements(data: unknown): Promise<unknown> {
    return this.http.request<unknown>('post', '/integrations/check', { data });
  }

  /**
   * Connect an integration
   */
  async connect(data: IntegrationConnectRequest): Promise<IntegrationConnectResponse> {
    return this.http.request<IntegrationConnectResponse>('post', '/integrations', { data });
  }

  /**
   * Get an integration by provider key
   */
  async get(provider: string): Promise<IntegrationDTO> {
    return this.http.request<IntegrationDTO>('get', `/integrations/${provider}`);
  }

  /**
   * Disconnect an integration
   */
  async disconnect(provider: string): Promise<void> {
    return this.http.request<void>('delete', `/integrations/${provider}`);
  }
}
