import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ScopeAppsExecute,
  ScopeAppsRead,
  type AgentConfigInput,
  type AgentVersionDTO,
  type CreateSandboxRequest,
  type SandboxDTO,
  type Scope,
  type ScopeDefinition,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 16a50d8 (INF-1062): vault inference.sh access copied into sandboxes;
 * metered app runs from a box use ScopeDefinition.sandbox on eligible scopes.
 */
describe('sandbox vault access (16a50d8 / INF-1062)', () => {
  it('types vault_id on AgentVersionDTO and AgentConfigInput', () => {
    const version: AgentVersionDTO = {
      id: 'ver-1',
      name: 'coder',
      vault_id: 'vault-workspace-9',
    } as AgentVersionDTO;
    expect(version.vault_id).toBe('vault-workspace-9');

    const config: AgentConfigInput = {
      system_prompt: 'ship',
      vault_id: 'vault-workspace-9',
    };
    expect(config.vault_id).toBe('vault-workspace-9');
  });

  it('types vault_id on CreateSandboxRequest for direct sandbox create', () => {
    const body: CreateSandboxRequest = {
      name: 'toolbox',
      vault_id: 'vault-hand-picked',
    };
    expect(body.vault_id).toBe('vault-hand-picked');
  });

  it('types api_scopes on SandboxDTO for vault-granted inference.sh access', () => {
    const scopes: Scope[] = [ScopeAppsRead, ScopeAppsExecute];
    const sandbox: SandboxDTO = {
      id: 'sb-1',
      name: 'worker',
      api_scopes: scopes,
    } as SandboxDTO;
    expect(sandbox.api_scopes).toEqual(['apps:read', 'apps:execute']);
  });

  it('types ScopeDefinition.sandbox for vault grant pickers (metered app execute)', () => {
    const meteredFromBox: ScopeDefinition = {
      value: ScopeAppsExecute,
      label: 'Run apps',
      description: 'Execute apps and spend credits',
      group: 'apps',
      costs_credits: true,
      sandbox: true,
    };
    expect(meteredFromBox.sandbox).toBe(true);
    expect(meteredFromBox.costs_credits).toBe(true);
    expect(meteredFromBox.value).toBe('apps:execute');
  });

  it('exports ScopeAppsExecute from the main barrel', () => {
    expect(ScopeAppsExecute).toBe('apps:execute');
    expect(main.ScopeAppsExecute).toBe('apps:execute');
  });

  it('documents vault copy semantics and SandboxMayHold in types.ts', () => {
    expect(typesSource).toMatch(/vault_id\?: string;/);
    expect(typesSource).toMatch(/AgentVersionDTO\.VaultID/);
    expect(typesSource).toMatch(/VaultDTO\.APIScopes/);
    expect(typesSource).toMatch(/models\.SandboxMayHold/);
    expect(typesSource).toMatch(/sandbox\?: boolean;/);
    expect(typesSource).toMatch(/api_scopes\?: Scope\[\];/);
    expect(typesSource).toMatch(/sandbox_create makes/);
    expect(typesSource).toMatch(/copied from its vault when it was made/);
  });
});
