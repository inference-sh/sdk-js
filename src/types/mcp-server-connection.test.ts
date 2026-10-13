import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CredentialScopeTeam,
  CredentialScopeUser,
  type ConnectionInfo,
  type MCPServerDTO,
  type MCPConnectionFacts,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * types regen d28ee34: MCPServerDTO.connection embeds ConnectionInfo
 * (caller login status/scope) plus MCPConnectionFacts (catalogue + last call).
 */
describe('MCPServerDTO.connection (d28ee34)', () => {
  it('accepts a full connection payload on directory and owned server responses', () => {
    const facts: MCPConnectionFacts = {
      connection_id: 'conn-9f2a',
      tool_count: 12,
      tools_listed_at: '2026-10-13T08:00:00Z',
      last_called_at: '2026-10-13T08:05:00Z',
      last_error: '',
    };

    const connection: ConnectionInfo = {
      ...facts,
      status: 'connected',
      scope: CredentialScopeTeam,
    };

    const server: MCPServerDTO = {
      id: 'mcp-1',
      user_id: 'u-1',
      team_id: 't-1',
      visibility: 'team',
      slug: 'notion',
      name: 'Notion',
      title: 'Notion MCP',
      description: '',
      icon_url: '',
      server_url: 'https://mcp.example/notion',
      auth_type: 'oauth',
      default_scopes: [],
      documentation_url: '',
      connection_status: 'connected',
      connection_scope: CredentialScopeTeam,
      connection,
    };

    expect(server.connection?.connection_id).toBe('conn-9f2a');
    expect(server.connection?.tool_count).toBe(12);
    expect(server.connection?.status).toBe('connected');
    expect(server.connection?.scope).toBe(CredentialScopeTeam);
  });

  it('allows error and disconnected shapes without catalogue facts', () => {
    const connection: ConnectionInfo = {
      status: 'error',
      scope: CredentialScopeUser,
      last_error: 'token refresh failed',
    };

    const server: Partial<MCPServerDTO> = {
      slug: 'github',
      connection,
    };

    expect(server.connection?.last_error).toBe('token refresh failed');
    expect(server.connection?.tool_count).toBeUndefined();
    expect(server.connection?.scope).toBe(CredentialScopeUser);
  });
});

describe('types.ts regen guards for MCP connection (d28ee34)', () => {
  it('defines MCPConnectionFacts with catalogue and last-call fields', () => {
    const block = typesSource.match(/export interface MCPConnectionFacts \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/connection_id\?: string/);
    expect(block![0]).toMatch(/tool_count\?: number/);
    expect(block![0]).toMatch(/tools_listed_at\?: string/);
    expect(block![0]).toMatch(/last_called_at\?: string/);
    expect(block![0]).toMatch(/last_error\?: string/);
  });

  it('extends ConnectionInfo from MCPConnectionFacts with status and scope', () => {
    expect(typesSource).toMatch(
      /export interface ConnectionInfo extends MCPConnectionFacts/
    );
    const block = typesSource.match(
      /export interface ConnectionInfo extends MCPConnectionFacts \{[\s\S]*?\n\}/
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/status\?: string/);
    expect(block![0]).toMatch(/scope\?: CredentialScope/);
  });

  it('adds optional connection on MCPServerDTO alongside legacy connection_* fields', () => {
    const block = typesSource.match(/export interface MCPServerDTO \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/connection_status\?: string/);
    expect(block![0]).toMatch(/connection_scope\?: CredentialScope/);
    expect(block![0]).toMatch(/connection\?: ConnectionInfo/);
  });
});
