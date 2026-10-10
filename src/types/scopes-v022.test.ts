import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index';
import {
  ErrorCodeAdminScopesNotApproved,
  ErrorCodeRequiresSignIn,
  type AgentVersionDTO,
  type AppSandbox,
  type AppVersionDTO,
  type ScopePreset,
  type ScopeRefusedMeta,
  type ScopesResponse,
} from '../types';

/**
 * Scope elevation, embed visitor reads, and app sandbox types shipped in
 * v0.22.0 (commits c5a776b, d02432e, e4de3de, af3c721, b09e9a9).
 */
describe('scope and sandbox types (v0.22.0)', () => {
  it('exports sign-in and admin-scope refusal error codes on the barrel', () => {
    expect(ErrorCodeRequiresSignIn).toBe('requires_sign_in');
    expect(ErrorCodeAdminScopesNotApproved).toBe('admin_scopes_not_approved');
    expect(main.ErrorCodeRequiresSignIn).toBe('requires_sign_in');
    expect(main.ErrorCodeAdminScopesNotApproved).toBe('admin_scopes_not_approved');
  });

  it('types ScopeRefusedMeta for insufficient_scope and requires_sign_in payloads', () => {
    const meta: ScopeRefusedMeta = { required_scope: 'approvals:write' };
    expect(meta.required_scope).toBe('approvals:write');
  });

  it('types ScopesResponse account_scopes and login_preset for GET /scopes', () => {
    const loginPreset: ScopePreset = {
      id: 'login',
      label: 'CLI login',
      description: 'Device approval default',
      scopes: ['profile:read'],
      grants: ['profile:read', 'approvals:write'],
      default: true,
    };
    const body: ScopesResponse = {
      scopes: [{ id: 'apps:run', label: 'Run apps', description: '', scopes: ['apps:run'] }],
      groups: [],
      presets: [loginPreset],
      account_scopes: [{ id: 'approvals:write', label: 'Approvals', description: '', scopes: ['approvals:write'] }],
      login_preset: loginPreset,
    };
    expect(body.account_scopes[0].id).toBe('approvals:write');
    expect(body.login_preset.grants).toContain('approvals:write');
  });

  it('types AgentVersionDTO.visitor_reads for embed publications', () => {
    const version: AgentVersionDTO = {
      id: 'ver-1',
      short_id: 'v1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'public',
      description: '',
      system_prompt: '',
      example_prompts: [],
      tools: [],
      skills: [],
      visitor_reads: ['knowledge', 'files'],
    };
    expect(version.visitor_reads).toEqual(['knowledge', 'files']);
  });

  it('types AppSandbox on AppVersionDTO for inf.yml sandbox exceptions', () => {
    const sandbox: AppSandbox = {
      host_network: true,
      capabilities: ['SYS_PTRACE'],
    };
    const version: AppVersionDTO = {
      id: 'av-1',
      short_id: 'av1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      metadata: {},
      repository: 'repo',
      setup_schema: {},
      input_schema: {},
      output_schema: {},
      env: {},
      kernel: 'linux',
      resources: {},
      sandbox,
    };
    expect(version.sandbox?.capabilities).toEqual(['SYS_PTRACE']);
  });

  it('keeps generated scope types in types.ts (regen guard)', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toMatch(/account_scopes: ScopeDefinition\[\]/);
    expect(source).toMatch(/login_preset: ScopePreset/);
    expect(source).toMatch(/visitor_reads\?: ScopeGroup\[\]/);
    expect(source).toMatch(/export interface AppSandbox/);
    expect(source).toMatch(/export interface ScopeRefusedMeta/);
  });
});
