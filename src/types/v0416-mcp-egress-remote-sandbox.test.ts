import * as main from '../index.js';
import {
  AuthMethodJWTHS256,
  AuthMethodTransportH2,
  EngineCapabilityEgressForms,
  EngineCapabilityEgressH2,
  EngineCapabilityEgressHostSuffix,
  ScopeGroupMCP,
  ScopeMCPExecute,
  type AuthMethodJWT,
  type AuthMethodTransport,
  type EngineCapability,
  type RemoteSandbox,
  type Scope,
  type ScopeGroup,
  type SystemInfo,
} from '../types.js';

/**
 * types regen 98dd8d9 / v0.41.6: MCP execute scope, egress engine caps,
 * remote exec file-rule sandbox metadata, and auth signing/transport types.
 */
describe('API key Scope mcp:execute (98dd8d9)', () => {
  it('exports ScopeMCPExecute and ScopeGroupMCP from the main barrel', () => {
    expect(ScopeMCPExecute).toBe('mcp:execute');
    expect(ScopeGroupMCP).toBe('mcp');
    expect(main.ScopeMCPExecute).toBe('mcp:execute');
    expect(main.ScopeGroupMCP).toBe('mcp');
  });

  it('keeps mcp scope literals stable for key permission payloads', () => {
    const scopes: Scope[] = [ScopeMCPExecute];
    const groups: ScopeGroup[] = [ScopeGroupMCP];
    expect(scopes).toEqual(['mcp:execute']);
    expect(groups).toEqual(['mcp']);
  });
});

describe('engine egress capabilities (98dd8d9)', () => {
  it('exports new EngineCapability constants from the main barrel', () => {
    expect(EngineCapabilityEgressForms).toBe('egress_forms');
    expect(EngineCapabilityEgressH2).toBe('egress_h2');
    expect(EngineCapabilityEgressHostSuffix).toBe('egress_host_suffix');
    expect(main.EngineCapabilityEgressForms).toBe('egress_forms');
    expect(main.EngineCapabilityEgressH2).toBe('egress_h2');
    expect(main.EngineCapabilityEgressHostSuffix).toBe('egress_host_suffix');
  });

  it('accepts egress capability tokens on EngineCapabilities lists', () => {
    const caps: EngineCapability[] = [
      EngineCapabilityEgressForms,
      EngineCapabilityEgressH2,
      EngineCapabilityEgressHostSuffix,
    ];
    expect(caps).toEqual(['egress_forms', 'egress_h2', 'egress_host_suffix']);
  });
});

describe('RemoteSandbox on SystemInfo (98dd8d9)', () => {
  it('types landlock sandbox metadata for remote exec file rules', () => {
    const sandbox: RemoteSandbox = {
      mechanism: 'landlock',
      version: 'abi 6',
      available: true,
      required: false,
    };
    const info: SystemInfo = {
      sandbox,
    };
    expect(info.sandbox?.mechanism).toBe('landlock');
    expect(info.sandbox?.available).toBe(true);
  });

  it('accepts unavailable sandbox with reason when enforcement is missing', () => {
    const sandbox: RemoteSandbox = {
      mechanism: 'none',
      available: false,
      reason: 'landlock not supported',
      required: true,
    };
    expect(sandbox.required).toBe(true);
    expect(sandbox.reason).toBe('landlock not supported');
  });
});

describe('auth method transport and JWT alg (98dd8d9)', () => {
  it('exports AuthMethodTransportH2 and AuthMethodJWTHS256 from the main barrel', () => {
    expect(AuthMethodTransportH2).toBe('h2');
    expect(AuthMethodJWTHS256).toBe('HS256');
    expect(main.AuthMethodTransportH2).toBe('h2');
    expect(main.AuthMethodJWTHS256).toBe('HS256');
  });

  it('keeps transport and JWT alg literals stable on AuthMethod shapes', () => {
    const transport: AuthMethodTransport = AuthMethodTransportH2;
    const jwt: AuthMethodJWT = {
      key: 'token',
      alg: AuthMethodJWTHS256,
      secret: 'signing_secret',
      ttl: 3600,
    };
    expect(transport).toBe('h2');
    expect(jwt.alg).toBe('HS256');
  });
});