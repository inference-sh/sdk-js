import { HttpClient } from '../http/client';
import type { Response } from '../http/response';
import {
  MCPServerDTO,
  CursorListRequest,
  CursorListResponse,
} from '../types';

/**
 * MCP Servers API
 */
export class MCPServersAPI {
  constructor(private readonly http: HttpClient) { }

  /**
   * List public MCP servers
   */
  async list(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<MCPServerDTO>>> {
    return this.http.request<CursorListResponse<MCPServerDTO>>('post', '/mcps/list', { data: params });
  }

  /**
   * Get an MCP server by slug
   */
  async get(slug: string): Promise<Response<MCPServerDTO>> {
    return this.http.request<MCPServerDTO>('get', `/mcps/${slug}`);
  }

  /**
   * List tools for an MCP server
   */
  async listTools(slug: string): Promise<Response<unknown[]>> {
    return this.http.request<unknown[]>('get', `/mcps/${slug}/tools`);
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(slug: string, tool: string, input: unknown): Promise<Response<unknown>> {
    return this.http.request<unknown>('post', `/mcps/${slug}/tools/${tool}`, { data: input });
  }

  /**
   * List user's own MCP servers
   */
  async listOwned(params?: Partial<CursorListRequest>): Promise<Response<CursorListResponse<MCPServerDTO>>> {
    return this.http.request<CursorListResponse<MCPServerDTO>>('post', '/mcp-servers/list', { data: params });
  }

  /**
   * Get a user's MCP server by ID
   */
  async getOwned(id: string): Promise<Response<MCPServerDTO>> {
    return this.http.request<MCPServerDTO>('get', `/mcp-servers/${id}`);
  }

  /**
   * Create an MCP server
   */
  async create(data: Partial<MCPServerDTO>): Promise<Response<MCPServerDTO>> {
    return this.http.request<MCPServerDTO>('post', '/mcp-servers', { data });
  }

  /**
   * Update an MCP server
   */
  async update(id: string, data: Partial<MCPServerDTO>): Promise<Response<MCPServerDTO>> {
    return this.http.request<MCPServerDTO>('put', `/mcp-servers/${id}`, { data });
  }

  /**
   * Delete an MCP server
   */
  async delete(id: string): Promise<Response<void>> {
    return this.http.request<void>('delete', `/mcp-servers/${id}`);
  }
}
