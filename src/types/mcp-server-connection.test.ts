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
 * types regen d28ee34 / 648d3ff: MCPServerDTO.connection embeds ConnectionInfo
 * (caller login status/scope) plus MCPConnectionFacts (catalogue + last call).
 * Flat connection_status / connection_scope remain for legacy readers (deprecated).
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
    expect(server.connection_status).toBe('connected');
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

describe('types.ts regen guards for MCP connection deprecation (648d3ff)', () => {
  it('marks flat connection_status as deprecated Connection.Status for legacy clients', () => {
    const block = typesSource.match(/export interface MCPServerDTO \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(
      /\/\*\*[\s\S]*?Deprecated: Connection\.Status[\s\S]*?\*\/\s*connection_status\?: string/
    );
  });

  it('marks flat connection_scope as deprecated Connection.Scope', () => {
    const block = typesSource.match(/export interface MCPServerDTO \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(
      /\/\*\*[\s\S]*?Deprecated: Connection\.Scope[\s\S]*?\*\/\s*connection_scope\?: CredentialScope/
    );
  });

  it('documents ConnectionInfo as standing with a server plus login-held facts', () => {
    expect(typesSource).toMatch(
      /ConnectionInfo is the caller's standing with a server/
    );
    expect(typesSource).toMatch(
      /what the connection made with that login holds/
    );
  });
});
