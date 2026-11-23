import * as main from '../index.js';
import {
  AuthMethodJWTHS256,
  AuthMethodTransportH2,
  EngineCapabilityEgressForms,
  EngineCapabilityEgressH2,
  EngineCapabilityEgressHostSuffix,
  EngineCapabilityTaskEnv,
  type AuthMethodJWT,
  type AuthMethodSign,
  type AuthMethodTransport,
  type EngineCapability,
  type RemoteSandbox,
  type SystemInfo,
} from '../types.js';

/**
 * types regen 98dd8d9 / v0.41.6 added egress caps, remote exec sandbox
 * metadata, and auth transport/signing; v0.41.7 (2bf0fc5) reverted mcp:execute.
 */
describe('API key Scope mcp:execute reverted (v0.41.7)', () => {
  it('does not export ScopeMCPExecute or ScopeGroupMCP from the main barrel', () => {
    expect('ScopeMCPExecute' in main).toBe(false);
    expect('ScopeGroupMCP' in main).toBe(false);
  });
});

describe('engine egress and task_env capabilities (98dd8d9)', () => {
  it('exports new EngineCapability constants from the main barrel', () => {
    expect(EngineCapabilityTaskEnv).toBe('task_env');
    expect(EngineCapabilityEgressForms).toBe('egress_forms');
    expect(EngineCapabilityEgressH2).toBe('egress_h2');
    expect(EngineCapabilityEgressHostSuffix).toBe('egress_host_suffix');
    expect(main.EngineCapabilityTaskEnv).toBe('task_env');
    expect(main.EngineCapabilityEgressForms).toBe('egress_forms');
    expect(main.EngineCapabilityEgressH2).toBe('egress_h2');
    expect(main.EngineCapabilityEgressHostSuffix).toBe('egress_host_suffix');
  });

  it('accepts capability tokens on EngineCapabilities lists', () => {
    const caps: EngineCapability[] = [
      EngineCapabilityTaskEnv,
      EngineCapabilityEgressForms,
      EngineCapabilityEgressH2,
      EngineCapabilityEgressHostSuffix,
    ];
    expect(caps).toEqual([
      'task_env',
      'egress_forms',
      'egress_h2',
      'egress_host_suffix',
    ]);
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

describe('auth method transport, JWT alg, and sign config (98dd8d9)', () => {
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

  it('types AuthMethodSign with required key_id and secret for egress signing', () => {
    const sign: AuthMethodSign = {
      key_id: 'access_key_id',
      secret: 'secret_access_key',
      preset: 'tc3',
      region: 'ap-southeast-1',
      service: 'ark',
      hosts: ['api.example.com'],
    };
    expect(sign.key_id).toBe('access_key_id');
    expect(sign.preset).toBe('tc3');
  });
});