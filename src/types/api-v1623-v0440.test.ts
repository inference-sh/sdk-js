import * as main from '../index.js';
import {
  ErrorCodeNothingToInvoice,
  ScopeRemotesExecute,
  ScopeRemotesRead,
  ScopeRemotesWrite,
  type InternalToolsConfig,
  type RemoteSandbox,
  type Scope,
} from '../types.js';

/**
 * api-v1623 / v0.44.0: remotes:execute scope, billing nothing_to_invoice,
 * InternalToolsConfig.credentials, RemoteSandbox mount namespace hints.
 */
describe('ScopeRemotesExecute (api-v1623)', () => {
  it('exports the scope constant from types and the main barrel', () => {
    expect(ScopeRemotesExecute).toBe('remotes:execute');
    expect(main.ScopeRemotesExecute).toBe('remotes:execute');
  });

  it('keeps remotes scope literals distinct for key and daemon policies', () => {
    const scopes: Scope[] = [ScopeRemotesRead, ScopeRemotesWrite, ScopeRemotesExecute];
    expect(scopes).toEqual(['remotes:read', 'remotes:write', 'remotes:execute']);
  });
});

describe('ErrorCodeNothingToInvoice (api-v1623)', () => {
  it('exports the 409 billing error constant from the main barrel', () => {
    expect(ErrorCodeNothingToInvoice).toBe('nothing_to_invoice');
    expect(main.ErrorCodeNothingToInvoice).toBe('nothing_to_invoice');
  });
});

describe('InternalToolsConfig.credentials (api-v1623)', () => {
  it('accepts opt-in credentials_search and credentials_ask tooling', () => {
    const tools: InternalToolsConfig = {
      remote: true,
      credentials: true,
    };
    expect(tools.credentials).toBe(true);
  });
});

describe('RemoteSandbox mount namespace fields (api-v1623)', () => {
  it('accepts mount_ns and no_mount_ns for daemon file-rule enforcement', () => {
    const sandbox: RemoteSandbox = {
      mount_ns: true,
      no_mount_ns: 'user namespaces disabled on host',
    };
    expect(sandbox.mount_ns).toBe(true);
    expect(sandbox.no_mount_ns).toContain('namespaces');
  });
});