import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  AuthSchemeClientAuthBasic,
  AuthSchemeClientAuthBody,
  AuthSchemeClientAuthNone,
  AuthSchemeFlowAuthorizationCode,
  AuthSchemeOAuth2,
  type AuthSchemeClientAuth,
  type AuthSchemeSpec,
  type CredentialRequirement,
} from '../types.js';

/**
 * types regen d29cdce (models v0.8.97): public OAuth clients (client_auth
 * none), RFC 8707 resource, RFC 9207 issuer, shared MCP callback, auth profiles.
 */
describe('AuthSchemeClientAuth none for public OAuth clients (d29cdce / v0.8.97)', () => {
  it('exports AuthSchemeClientAuthNone from types and the main barrel', () => {
    expect(AuthSchemeClientAuthNone).toBe('none');
    expect(main.AuthSchemeClientAuthNone).toBe('none');
  });

  it('keeps client_auth literals stable including public clients without secrets', () => {
    const methods: AuthSchemeClientAuth[] = [
      AuthSchemeClientAuthBasic,
      AuthSchemeClientAuthBody,
      AuthSchemeClientAuthNone,
    ];
    expect(methods).toEqual(['basic', 'body', 'none']);
  });

  it('keeps client_auth none in the AuthSchemeClientAuth union in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toMatch(
      /export type AuthSchemeClientAuth = "basic" \| "body" \| "none"/
    );
    expect(source).toMatch(
      /export const AuthSchemeClientAuthNone: AuthSchemeClientAuth = "none"/
    );
  });
});

describe('AuthSchemeSpec resource, issuer, callback, and profile (d29cdce / v0.8.97)', () => {
  it('models MCP-style OAuth with PKCE, resource indicator, and shared callback', () => {
    const auth: AuthSchemeSpec = {
      kind: AuthSchemeOAuth2,
      flow: AuthSchemeFlowAuthorizationCode,
      pkce: true,
      client_auth: AuthSchemeClientAuthNone,
      resource: 'https://mcp.example.com/sse',
      issuer: 'https://auth.example.com',
      authorization_response_iss_parameter_supported: true,
      callback: 'mcp',
      profile: 'mcp_dynamic_client',
      authorization_endpoint: 'https://auth.example.com/authorize',
      token_endpoint: 'https://auth.example.com/token',
    };

    expect(auth.client_auth).toBe('none');
    expect(auth.resource).toBe('https://mcp.example.com/sse');
    expect(auth.issuer).toBe('https://auth.example.com');
    expect(auth.authorization_response_iss_parameter_supported).toBe(true);
    expect(auth.callback).toBe('mcp');
    expect(auth.profile).toBe('mcp_dynamic_client');
  });

  it('embeds extended auth scheme on manifest CredentialRequirement.auth', () => {
    const requirement: CredentialRequirement = {
      slug: 'remote-mcp',
      auth: {
        kind: AuthSchemeOAuth2,
        client_auth: AuthSchemeClientAuthNone,
        pkce: true,
        resource: 'https://tools.example/mcp',
        callback: 'mcp',
      },
    };

    expect(requirement.auth?.client_auth).toBe('none');
    expect(requirement.auth?.resource).toMatch(/^https:\/\//);
    expect(requirement.auth?.callback).toBe('mcp');
  });

  it('keeps new AuthSchemeSpec fields in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    const block = source.match(/export interface AuthSchemeSpec \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/resource\?: string/);
    expect(block![0]).toMatch(/issuer\?: string/);
    expect(block![0]).toMatch(/authorization_response_iss_parameter_supported\?: boolean/);
    expect(block![0]).toMatch(/callback\?: string/);
    expect(block![0]).toMatch(/profile\?: string/);
    expect(block![0]).toMatch(/client_auth\?: AuthSchemeClientAuth/);
  });
});
