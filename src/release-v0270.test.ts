import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index.js';
import { SDK_VERSION } from './version.js';
import {
  CredentialScopeTeam,
  type ConnectionInfo,
  type MCPServerDTO,
  type MCPConnectionFacts,
  type MessageInput,
} from './types.js';

const root = join(__dirname, '..');

/**
 * Releases 644b7f4 + 90fc49a: v0.27.0 documents MessageInput.attachments on
 * sendMessage, ClientToolResult on tool-builder handlers, and MCPServerDTO.connection
 * (ConnectionInfo + MCPConnectionFacts). Changelog for 0.26.2 is cut to its own section.
 */
describe('release v0.27.0 (90fc49a)', () => {
  it('ships version 0.27.0 and documents the release in CHANGELOG', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.27.0');
    expect(SDK_VERSION).toBe('0.27.0');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.27\.0\]/);
    expect(changelog).toMatch(/## \[0\.27\.0\] - 2026-10-13/);
    expect(changelog).toMatch(/MessageInput\.attachments/);
    expect(changelog).toMatch(/deprecated `images` \/ `files` URI lists/);
    expect(changelog).toMatch(/ClientToolResult.*package root/);
    expect(changelog).toMatch(/MCPServerDTO\.connection/);
    expect(changelog).toMatch(/`connection_status` is deprecated/);

    expect(changelog).toMatch(/## \[0\.26\.2\] - 2026-10-13/);
    expect(changelog).toMatch(/mcpTool\(name, \{ server, toolName, credentialId\? \}\)/);
  });

  it('exports ClientToolResult from the package root', () => {
    type Exported = typeof main & { ClientToolResult?: unknown };
    const sdk = main as Exported;
    // Runtime export is type-only; ensure the barrel still re-exports the symbol.
    const indexSource = readFileSync(join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toMatch(/ClientToolResult/);
    expect(sdk).not.toHaveProperty('CredentialProviderMCP');
  });

  it('types MessageInput with attachments instead of legacy URI lists', () => {
    const withAttachments: MessageInput = {
      text: 'see file',
      attachments: [{ uri: 'inf://files/a', filename: 'a.png', content_type: 'image/png' }],
    };
    const textOnly: MessageInput = { text: 'hi' };
    expect(withAttachments.attachments?.[0]?.filename).toBe('a.png');
    expect(textOnly).not.toHaveProperty('attachments');
  });

  it('types MCPServerDTO.connection as ConnectionInfo with MCP catalogue facts', () => {
    const facts: MCPConnectionFacts = {
      connection_id: 'conn-rel',
      tool_count: 4,
      tools_listed_at: '2026-10-13T09:00:00Z',
      last_called_at: '2026-10-13T09:01:00Z',
      last_error: '',
    };
    const connection: ConnectionInfo = {
      ...facts,
      status: 'connected',
      scope: CredentialScopeTeam,
    };
    const server: MCPServerDTO = {
      id: 'mcp-rel',
      user_id: 'u-1',
      team_id: 't-1',
      visibility: 'team',
      slug: 'github',
      name: 'GitHub',
      title: 'GitHub',
      description: '',
      icon_url: '',
      server_url: 'https://mcp.example/github',
      auth_type: 'oauth',
      default_scopes: [],
      documentation_url: '',
      connection,
    };
    expect(server.connection?.connection_id).toBe('conn-rel');
    expect(server.connection?.tool_count).toBe(4);
    expect(server.connection?.scope).toBe(CredentialScopeTeam);
  });
});

describe('source guards for v0.27.0 behavior', () => {
  it('Agent.sendMessage builds MessageInput.attachments, not images/files lists', () => {
    const agentsSource = readFileSync(join(__dirname, 'api', 'agents.ts'), 'utf8');
    const sendBlock = agentsSource.match(
      /const input: MessageInput = attachments \? \{ text, attachments \} : \{ text \}/
    );
    expect(sendBlock).not.toBeNull();
    expect(agentsSource).not.toMatch(/input:\s*\{[^}]*\bimages\b/);
    expect(agentsSource).not.toMatch(/MessageInput[^;]*\bfiles:\s*string/);
  });

  it('tool-builder documents ClientToolResult attachments on fluent handlers', () => {
    const source = readFileSync(join(__dirname, 'tool-builder.ts'), 'utf8');
    expect(source).toMatch(
      /export type ClientToolResult = string \| \{ result: string; attachments\?: FileRef\[\] \}/
    );
  });

  it('types.ts keeps nested connection on MCPServerDTO with deprecated flat fields', () => {
    const source = readFileSync(join(__dirname, 'types.ts'), 'utf8');
    const dto = source.match(/export interface MCPServerDTO \{[\s\S]*?\n\}/);
    expect(dto).not.toBeNull();
    expect(dto![0]).toMatch(/connection\?: ConnectionInfo/);
    expect(dto![0]).toMatch(/connection_status\?: string/);
    expect(dto![0]).toMatch(/Deprecated: Connection\.Status/);

    expect(source).toMatch(/export interface ConnectionInfo extends MCPConnectionFacts/);
    expect(source).toMatch(/export interface MCPConnectionFacts/);
    expect(source).toMatch(/tool_count\?: number/);
  });
});
