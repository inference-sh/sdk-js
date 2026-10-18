import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ToolAuthTypeCredential,
  type HTTPToolConfig,
  type MCPToolConfig,
  type MCPToolConfigDTO,
  type ToolAuthConfig,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * INF-1012 (dc64a0b): tools no longer pin a connection; generated types drop
 * credential_id from ToolAuthConfig and MCP tool configs.
 */
describe('tool auth and MCP config types (INF-1012)', () => {
  it('accepts credential auth with provider only on HTTP tools', () => {
    const auth: ToolAuthConfig = {
      type: ToolAuthTypeCredential,
      provider: 'google',
    };

    const http: HTTPToolConfig = {
      url: 'https://api.example.com/send',
      auth,
    };

    expect(http.auth).toEqual({ type: 'credential', provider: 'google' });
    expect(http.auth).not.toHaveProperty('credential_id');
  });

  it('accepts MCP tool configs with server slug and tool name only', () => {
    const mcp: MCPToolConfig = { server: 'notion', tool_name: 'search' };
    const dto: MCPToolConfigDTO = { server: 'notion', tool_name: 'search' };

    expect(mcp).toEqual(dto);
    expect(mcp).not.toHaveProperty('credential_id');
  });
});

describe('types.ts regen guards for INF-1012', () => {
  it('ToolAuthConfig has no credential_id field', () => {
    const block = typesSource.match(
      /export interface ToolAuthConfig(?: extends [^{]+)? \{[\s\S]*?\n\}/
    );
    expect(block).not.toBeNull();
    const body = block![0];

    expect(body).toMatch(/provider\?: string;/);
    expect(body).not.toMatch(/credential_id/);
  });

  it('MCPToolConfig documents runner connection and omits credential_id', () => {
    const docAndBlock = typesSource.match(
      /\/\*\*[\s\S]*?MCPToolConfig is a tool[\s\S]*?\*\/\s*export interface MCPToolConfig(?: extends [^{]+)? \{[\s\S]*?\n\}/
    );
    expect(docAndBlock).not.toBeNull();
    const body = docAndBlock![0];

    expect(body).toMatch(/server\?: string;/);
    expect(body).toMatch(/tool_name: string;/);
    expect(body).toMatch(/Credential\.ToolConnection/);
    expect(body).not.toMatch(/credential_id/);
  });

  it('MCPToolConfigDTO requires server and tool_name without credential_id', () => {
    const block = typesSource.match(
      /export interface MCPToolConfigDTO(?: extends [^{]+)? \{[\s\S]*?\n\}/
    );
    expect(block).not.toBeNull();
    const body = block![0];

    expect(body).toMatch(/server: string;/);
    expect(body).toMatch(/tool_name: string;/);
    expect(body).not.toMatch(/credential_id/);
  });
});
