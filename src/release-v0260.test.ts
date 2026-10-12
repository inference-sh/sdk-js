import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 9fce233 / changelog e742952: v0.26.0 ships the credential model type
 * regen (ProviderSeed, slug-keyed requirements, auth scheme vocabulary, MCP credentials).
 */
describe('release v0.26.0 (9fce233)', () => {
  it('ships version 0.26.0 and documents credential-model breaking changes in the changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.26.0');
    expect(SDK_VERSION).toBe('0.26.0');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[0\.26\.0\]/);
    expect(changelog).toMatch(/ProviderSeed/);
    expect(changelog).toMatch(/CredentialRequirements/);
    expect(changelog).toMatch(/AuthSchemeKind/);
    expect(changelog).toMatch(/provider_info/);
    expect(changelog).toMatch(/keyed by slug/);
  });

  it('keeps f5a8c09 generated credential model shapes in types.ts', () => {
    const source = readFileSync(join(__dirname, 'types.ts'), 'utf8');

    const requirement = source.match(/export interface CredentialRequirement \{[\s\S]*?\n\}/);
    expect(requirement).not.toBeNull();
    expect(requirement![0]).toMatch(/slug\?: string/);
    expect(requirement![0]).toMatch(/provider\?: ProviderSeed/);
    expect(requirement![0]).toMatch(/auth\?: AuthSchemeSpec/);
    expect(requirement![0]).not.toMatch(/\n\s+key\?: string/);

    expect(source).toMatch(/export type CredentialRequirements = CredentialRequirement\[\]/);
    expect(source).toMatch(/export interface ProviderSeed \{[\s\S]*name\?: string[\s\S]*website\?: string/);
    expect(source).toMatch(/export interface ProviderSummary \{[\s\S]*slug: string/);
    expect(source).toMatch(/export interface ConnectTokens \{[\s\S]*access_token/);
    expect(source).toMatch(/export interface SecretField \{[\s\S]*key: string/);

    expect(source).toMatch(/export const AuthSchemeOAuth2: AuthSchemeKind = "oauth2"/);
    expect(source).toMatch(/export const AuthSchemeAPIKey: AuthSchemeKind = "api_key"/);
    expect(source).toMatch(/export const AuthSchemeHTTP: AuthSchemeKind = "http"/);
    expect(source).toMatch(
      /export const AuthSchemeFlowAuthorizationCode: AuthSchemeFlow = "authorization_code"/
    );

    const config = source.match(/export interface CredentialConfigDTO \{[\s\S]*?\n\}/);
    expect(config).not.toBeNull();
    expect(config![0]).toMatch(/provider_info\?: ProviderSummary/);

    const mcp = source.match(/export interface MCPServerDTO \{[\s\S]*?\n\}/);
    expect(mcp).not.toBeNull();
    expect(mcp![0]).toMatch(/credentials\?: CredentialRequirements/);
    expect(mcp![0]).toMatch(/credential_slug\?: string/);
  });
});
