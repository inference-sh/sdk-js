import { readFileSync } from 'fs';
import { join } from 'path';
import { mcpTool, httpTool } from './tool-builder.js';
import { SDK_VERSION } from './version.js';
import {
  ToolAuthTypeCredential,
  type HTTPToolConfig,
  type MCPToolConfig,
  type MCPToolConfigDTO,
  type ToolAuthConfig,
  CredentialProviderGoogle,
} from './types.js';

const root = join(__dirname, '..');

/**
 * Release d4b1265 / dc64a0b: v0.30.0 ships INF-1012 — tools no longer pin a
 * connection; MCP tools require a server slug; generated types drop credential_id.
 */
describe('release v0.30.0 (d4b1265)', () => {
  it('ships version 0.30.0 and documents INF-1012 in CHANGELOG', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.30.0');
    expect(SDK_VERSION).toBe('0.30.0');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.30\.0\]/);
    expect(changelog).toMatch(/## \[0\.30\.0\] - 2026-10-18/);
    expect(changelog).toMatch(/`credentialId` on `httpTool\(\)\.auth\(\)` and `mcpTool\(\)`/);
    expect(changelog).toMatch(/positional `mcpTool\(name, credentialId, toolName\)`/);
    expect(changelog).toMatch(/INF-1012/);
    expect(changelog).toMatch(/MCPToolConfigDTO` lose `credential_id`/);
    expect(changelog).toMatch(/## \[0\.29\.0\] - 2026-10-17/);
  });

  it('built AgentTool payloads never emit credential_id on HTTP or MCP tools', () => {
    const http = httpTool('gmail', 'https://api.example.com')
      .auth({ credential: CredentialProviderGoogle })
      .build();
    const mcp = mcpTool('search', { server: 'notion', toolName: 'search' }).build();

    expect(JSON.stringify(http)).not.toMatch(/credential_id/);
    expect(JSON.stringify(mcp)).not.toMatch(/credential_id/);
    expect(mcp.mcp).toEqual({ server: 'notion', tool_name: 'search' });
  });
});

describe('tool auth and MCP config types (INF-1012, dc64a0b)', () => {
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

describe('source guards for v0.30.0 behavior (INF-1012)', () => {
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const toolBuilderSource = readFileSync(join(__dirname, 'tool-builder.ts'), 'utf8');

  it('tool-builder exposes only mcpTool(name, MCPToolTarget) and never writes credential_id', () => {
    expect(toolBuilderSource).toMatch(/export function mcpTool\(name: string, target: MCPToolTarget\)/);
    expect(toolBuilderSource).not.toMatch(/credentialId\?: string/);
    expect(toolBuilderSource).not.toMatch(/typeof target === 'string'/);
    expect(toolBuilderSource).toMatch(/server: this\.target\.server/);
    expect(toolBuilderSource).not.toMatch(/credential_id/);
  });

  it('HTTP auth config omits credentialId from the builder API', () => {
    expect(toolBuilderSource).toMatch(
      /auth\(config: \{[\s\S]*credential\?: string;[\s\S]*apiKey\?: string/
    );
    expect(toolBuilderSource).toMatch(
      /this\.authConfig = \{ type: ToolAuthTypeCredential, provider: config\.credential \}/
    );
  });

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
