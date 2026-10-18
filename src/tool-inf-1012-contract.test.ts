import { readFileSync } from 'fs';
import { join } from 'path';
import { mcpTool, httpTool } from './tool-builder.js';
import { CredentialProviderGoogle } from './types.js';

const root = join(__dirname, '..');

/**
 * INF-1012 (dc64a0b): credentialId removed from builders; MCP server slug required.
 */
describe('INF-1012 release contract (dc64a0b)', () => {
  it('documents the breaking change under CHANGELOG [Unreleased]', () => {
    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    const unreleased = changelog.split('## [0.29.0]')[0];

    expect(unreleased).toMatch(/### Removed/);
    expect(unreleased).toMatch(/INF-1012/);
    expect(unreleased).toMatch(/`credentialId` on `httpTool\(\)\.auth\(\)` and `mcpTool\(\)`/);
    expect(unreleased).toMatch(/MCPToolConfigDTO` lose `credential_id`/);
  });

  it('tool-builder source no longer accepts credential pins or positional mcpTool', () => {
    const source = readFileSync(join(__dirname, 'tool-builder.ts'), 'utf8');

    expect(source).toMatch(/export function mcpTool\(name: string, target: MCPToolTarget\)/);
    expect(source).not.toMatch(/credentialId\?: string/);
    expect(source).not.toMatch(/typeof target === 'string'/);
    expect(source).toMatch(/server: this\.target\.server/);
    expect(source).not.toMatch(/credential_id/);
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
