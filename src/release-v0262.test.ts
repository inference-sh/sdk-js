import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index.js';
import { SDK_VERSION } from './version.js';
import type { MCPToolConfig, MCPToolConfigDTO } from './types.js';

const root = join(__dirname, '..');

/**
 * Release e853130: v0.26.2 packages INF-1063 MCP tool/server model (79ce8dd–0e728c6),
 * optional MCPToolConfig.server for legacy connection-only tools (0bc50ec), and
 * reasoning_state on LLM payloads (2a64e73). Changelog for this line is still under
 * [Unreleased] until the next changelog cut.
 */
describe('release v0.26.2 (e853130)', () => {
  it('ships version 0.26.2 and documents MCP tool changes in the changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.26.2');
    expect(SDK_VERSION).toBe('0.26.2');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[Unreleased\]/);
    expect(changelog).toMatch(/mcpTool\(name, \{ server, toolName, credentialId\? \}\)/);
    expect(changelog).toMatch(/mcpTool\(name, credentialId, toolName\)/);
    expect(changelog).toMatch(/MCPServerUpdateBody/);
    expect(changelog).toMatch(/credentials/);
    expect(changelog).toMatch(/MCPToolConfig\.server/);
    expect(changelog).toMatch(/CredentialProviderMCP/);
    expect(changelog).toMatch(/oauth_client_id/);
  });

  it('does not export removed MCP credential provider symbols', () => {
    expect(main).not.toHaveProperty('CredentialProviderMCP');
    expect(main).not.toHaveProperty('CredentialTypeMCP');
  });

  it('types MCPToolConfig with optional server for connection-only legacy tools (0bc50ec)', () => {
    const legacyConnectionOnly: MCPToolConfig = {
      tool_name: 'search',
      credential_id: 'cred-legacy',
    };
    const withServer: MCPToolConfig = {
      server: 'notion',
      tool_name: 'search',
    };

    expect(legacyConnectionOnly.server).toBeUndefined();
    expect(withServer.credential_id).toBeUndefined();

    const dto: MCPToolConfigDTO = {
      server: 'github',
      tool_name: 'search_code',
    };
    expect(dto.server).toBe('github');
  });
});

describe('types.ts regen guards for v0.26.2 stack', () => {
  const source = readFileSync(join(__dirname, 'types.ts'), 'utf8');

  it('documents MCPToolConfig with optional server and optional credential_id', () => {
    const block = source.match(/export interface MCPToolConfig \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/server\?: string/);
    expect(block![0]).toMatch(/tool_name: string/);
    expect(block![0]).toMatch(/credential_id\?: string/);
    expect(block![0]).not.toMatch(/credential_id: string/);
  });

  it('keeps MCPToolConfigDTO server required on API responses', () => {
    const block = source.match(/export interface MCPToolConfigDTO \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/server: string/);
    expect(block![0]).toMatch(/tool_name: string/);
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

  it('exports ReasoningState on LLM output and assistant context (INF-1066)', () => {
    expect(source).toMatch(/export type ReasoningState =/);
    const llmOutput = source.match(/export interface LLMOutput \{[\s\S]*?\n\}/);
    expect(llmOutput).not.toBeNull();
    expect(llmOutput![0]).toMatch(/reasoning_state\?: ReasoningState/);

    const contextMsg = source.match(/export interface LLMContextMessage \{[\s\S]*?\n\}/);
    expect(contextMsg).not.toBeNull();
    expect(contextMsg![0]).toMatch(/reasoning_state\?: ReasoningState/);
  });
});

describe('tool-builder.ts guards for unified mcpTool (0e728c6)', () => {
  const source = readFileSync(join(__dirname, 'tool-builder.ts'), 'utf8');

  it('keeps object and legacy string-second-argument overloads', () => {
    expect(source).toMatch(
      /export function mcpTool\(name: string, target: MCPToolTarget \| string, toolName\?: string\)/
    );
    expect(source).toMatch(/if \(typeof target === 'string'\)/);
    expect(source).toMatch(/toolName: toolName \?\? ''/);
    expect(source).toMatch(/credentialId: target/);
  });

  it('omits server from built mcp config when only credential_id is set', () => {
    expect(source).toMatch(/\.\.\.\(this\.target\.server \? \{ server: this\.target\.server \} : \{\}\)/);
  });
});
