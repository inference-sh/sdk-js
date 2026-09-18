import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import {
  CredentialDTO,
  CredentialConfigDTO,
  CredentialConnectRequest,
  CredentialConnectResponse,
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
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<CredentialDTO>>> {
    return this.http.request<CursorListResponse<CredentialDTO>>('post', '/credentials/list', { data: params });
  }

  /**
   * Get available integrations
   */
  async listAvailable(): Promise<Response<CredentialConfigDTO[]>> {
    return this.http.request<CredentialConfigDTO[]>('get', '/credentials/available');
  }

  /**
   * Get integration configs
   */
  async getConfigs(): Promise<Response<CredentialConfigDTO[]>> {
    return this.http.request<CredentialConfigDTO[]>('get', '/credentials/configs');
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
  async connect(data: CredentialConnectRequest): Promise<Response<CredentialConnectResponse>> {
    return this.http.request<CredentialConnectResponse>('post', '/credentials', { data });
  }

  /**
   * Get an integration by provider key
   */
  async get(provider: string): Promise<Response<CredentialDTO>> {
    return this.http.request<CredentialDTO>('get', `/credentials/${provider}`);
  }

  /**
   * Disconnect an integration
   */
  async disconnect(provider: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/credentials/${provider}`);
  }
}
