import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import {
  CheckRequirementsRequest,
  CheckRequirementsResponse,
  CredentialDTO,
  CredentialConfigDTO,
  CredentialConnectRequest,
  CredentialConnectResponse,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * Credentials API: the accounts and keys a team has connected to external services.
 */
export class CredentialsAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List credentials with cursor-based pagination
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<CredentialDTO>>> {
    return this.http.request<CursorListResponse<CredentialDTO>>('post', '/credentials/list', { data: params });
  }

  /**
   * List the providers a credential can be connected for
   */
  async listAvailable(): Promise<Response<CredentialConfigDTO[]>> {
    return this.http.request<CredentialConfigDTO[]>('get', '/credentials/available');
  }

  /**
   * Get provider connection configs
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
   * Check whether secret and credential requirements are satisfied
   */
  async checkRequirements(data: CheckRequirementsRequest): Promise<Response<CheckRequirementsResponse>> {
    return this.http.request<CheckRequirementsResponse>('post', '/credentials/check', { data });
  }

  /**
   * Connect a credential
   */
  async connect(data: CredentialConnectRequest): Promise<Response<CredentialConnectResponse>> {
    return this.http.request<CredentialConnectResponse>('post', '/credentials', { data });
  }

  /**
   * Get a credential by provider key
   */
  async get(provider: string): Promise<Response<CredentialDTO>> {
    return this.http.request<CredentialDTO>('get', `/credentials/${encodeURIComponent(provider)}`);
  }

  /**
   * Disconnect a credential
   */
  async disconnect(provider: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/credentials/${encodeURIComponent(provider)}`);
  }
}
