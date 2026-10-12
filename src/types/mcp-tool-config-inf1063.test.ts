import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  CredentialTypeAPIKey,
  CredentialTypeOAuth,
  CredentialTypeServiceAccount,
  CredentialTypeWIF,
  MCPServerAuthAPIKey,
  MCPServerAuthNone,
  MCPServerAuthOAuth,
  ToolTypeMCP,
  type AgentTool,
  type AgentToolDTO,
  type CredentialType,
  type MCPServerAuthType,
  type MCPServerDTO,
  type MCPToolConfig,
  type MCPToolConfigDTO,
} from '../types.js';

/**
 * INF-1063 (79ce8dd types + 121f996 mcpTool): MCP tools reference a server
 * slug; credential_id is optional; MCP is no longer a Credential provider/type;
 * MCPServerDTO drops oauth_client_id from the read model.
 */
describe('MCPToolConfig agent tools (INF-1063)', () => {
  it('requires server and tool_name; credential_id is optional', () => {
    const withCredential: MCPToolConfig = {
      server: 'notion',
      tool_name: 'search',
      credential_id: 'cred-1',
    };
    const runnerDefault: MCPToolConfig = {
      server: 'filesystem',
      tool_name: 'read_file',
    };

    const tool: AgentTool = {
      name: 'read',
      description: 'Read via MCP',
      type: ToolTypeMCP,
      mcp: runnerDefault,
    };

    expect(withCredential.server).toBe('notion');
    expect(runnerDefault.credential_id).toBeUndefined();
    expect(tool.mcp?.server).toBe('filesystem');
  });

  it('keeps MCPToolConfigDTO aligned for API responses', () => {
    const dto: AgentToolDTO = {
      name: 'mcp_search',
      description: 'Search',
      type: ToolTypeMCP,
      mcp: {
        server: 'github',
        tool_name: 'search_code',
      },
    };

    const config: MCPToolConfigDTO = dto.mcp!;
    expect(config.server).toBe('github');
    expect(config.credential_id).toBeUndefined();
  });
});

describe('MCP server and credential enums (INF-1063)', () => {
  it('exports MCPServerAuthType constants from the main barrel', () => {
    expect(main.MCPServerAuthOAuth).toBe('oauth');
    expect(main.MCPServerAuthAPIKey).toBe('api_key');
    expect(main.MCPServerAuthNone).toBe('none');
  });

  it('keeps MCPServerAuthType literals stable for server registration', () => {
    const authTypes: MCPServerAuthType[] = [
      MCPServerAuthOAuth,
      MCPServerAuthAPIKey,
      MCPServerAuthNone,
    ];
    expect(authTypes).toEqual(['oauth', 'api_key', 'none']);
  });

  it('keeps CredentialType without the removed mcp category', () => {
    const types: CredentialType[] = [
      CredentialTypeOAuth,
      CredentialTypeAPIKey,
      CredentialTypeServiceAccount,
      CredentialTypeWIF,
    ];
    expect(types).toEqual(['oauth', 'api_key', 'service_account', 'wif']);
    expect(types).not.toContain('mcp');
  });

  it('does not export CredentialProviderMCP or CredentialTypeMCP after regen', () => {
    expect(main).not.toHaveProperty('CredentialProviderMCP');
    expect(main).not.toHaveProperty('CredentialTypeMCP');
  });

  it('models MCPServerDTO without oauth_client_id on the read shape', () => {
    const server: MCPServerDTO = {
      id: 'mcp-1',
      user_id: 'u-1',
      team_id: 't-1',
      visibility: 'private',
      slug: 'notion',
      name: 'Notion',
      title: 'Notion MCP',
      description: 'Notion tools',
      icon_url: 'https://example.com/icon.png',
      server_url: 'https://mcp.example.com',
      auth_type: MCPServerAuthOAuth,
      default_scopes: ['read'],
      documentation_url: 'https://docs.example.com',
    };

    expect(server.auth_type).toBe('oauth');
    expect(server).not.toHaveProperty('oauth_client_id');
  });
});

describe('types.ts regen guards for INF-1063', () => {
  const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('documents MCPToolConfig with required server and optional credential_id', () => {
    const block = source.match(/export interface MCPToolConfig \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/server: string/);
    expect(block![0]).toMatch(/tool_name: string/);
    expect(block![0]).toMatch(/credential_id\?: string/);
    expect(block![0]).not.toMatch(/credential_id: string/);
  });

  it('removes MCP from CredentialProvider and CredentialType unions', () => {
    const providerUnion = source.match(/export type CredentialProvider =[\s\S]*?;/);
    expect(providerUnion).not.toBeNull();
    expect(providerUnion![0]).not.toMatch(/\| "mcp"/);

    const typeUnion = source.match(/export type CredentialType =[\s\S]*?;/);
    expect(typeUnion).not.toBeNull();
    expect(typeUnion![0]).not.toMatch(/\| "mcp"/);
    expect(source).not.toMatch(/export const CredentialProviderMCP/);
    expect(source).not.toMatch(/export const CredentialTypeMCP/);
  });

  it('drops oauth_client_id from MCPServerDTO while keeping auth_type', () => {
    const dto = source.match(/export interface MCPServerDTO \{[\s\S]*?\n\}/);
    expect(dto).not.toBeNull();
    expect(dto![0]).toMatch(/auth_type: MCPServerAuthType/);
    expect(dto![0]).not.toMatch(/oauth_client_id/);
  });

  it('documents that credential_id pins the MCP connection when set', () => {
    expect(source).toMatch(/CredentialID pins the connection the call signs in with/);
  });
});

describe('mcpTool builder contract (121f996)', () => {
  const source = readFileSync(join(__dirname, '../tool-builder.ts'), 'utf8');

  it('names server before toolName and makes credentialId optional', () => {
    expect(source).toMatch(
      /export const mcpTool = \(name: string, server: string, toolName: string, credentialId\?: string\)/,
    );
    expect(source).toMatch(/server: this\.server/);
    expect(source).toMatch(/\.\.\.\(this\.credentialId \? \{ credential_id: this\.credentialId \} : \{\}\)/);
  });
});
