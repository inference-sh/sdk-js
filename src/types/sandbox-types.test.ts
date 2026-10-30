import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EngineCapabilityEgressGateway,
  EngineCapabilitySandboxes,
  ResourceFeatureSandboxes,
  SandboxDesiredDeleted,
  SandboxDesiredRunning,
  SandboxDesiredStopped,
  SandboxStatusFailed,
  SandboxStatusPending,
  SandboxStatusRunning,
  SandboxStatusStarting,
  SandboxStatusStopped,
  SandboxStatusStopping,
  ScopeGroupSandboxes,
  ScopeSandboxesRead,
  ScopeSandboxesWrite,
  type CreateSandboxRequest,
  type EngineCapability,
  type SandboxDesiredState,
  type SandboxDTO,
  type SandboxStatus,
  type Scope,
} from '../types.js';

/**
 * Managed sandboxes API types (api#2001 / 5097a18): scopes, lifecycle enums,
 * entitlement gate, and scheduler capability. 96453ff adds generation plus
 * engine_id/worker_id placement on SandboxDTO.
 */
describe('sandbox API scopes (5097a18)', () => {
  it('exports sandboxes read/write scopes and scope group from the main barrel', () => {
    expect(main.ScopeSandboxesRead).toBe('sandboxes:read');
    expect(main.ScopeSandboxesWrite).toBe('sandboxes:write');
    expect(main.ScopeGroupSandboxes).toBe('sandboxes');
    expect(ScopeSandboxesRead).toBe('sandboxes:read');
    expect(ScopeSandboxesWrite).toBe('sandboxes:write');
    expect(ScopeGroupSandboxes).toBe('sandboxes');
  });

  it('keeps sandbox scope literals assignable to Scope', () => {
    const scopes: Scope[] = [ScopeSandboxesRead, ScopeSandboxesWrite];
    expect(scopes).toEqual(['sandboxes:read', 'sandboxes:write']);
  });
});

describe('sandbox lifecycle types (5097a18)', () => {
  it('exports SandboxStatus constants from the main barrel', () => {
    expect(main.SandboxStatusPending).toBe('pending');
    expect(main.SandboxStatusStarting).toBe('starting');
    expect(main.SandboxStatusRunning).toBe('running');
    expect(main.SandboxStatusStopping).toBe('stopping');
    expect(main.SandboxStatusStopped).toBe('stopped');
    expect(main.SandboxStatusFailed).toBe('failed');
  });

  it('keeps status literals stable for reconciler-driven UI', () => {
    const statuses: SandboxStatus[] = [
      SandboxStatusPending,
      SandboxStatusStarting,
      SandboxStatusRunning,
      SandboxStatusStopping,
      SandboxStatusStopped,
      SandboxStatusFailed,
    ];
    expect(statuses).toEqual([
      'pending',
      'starting',
      'running',
      'stopping',
      'stopped',
      'failed',
    ]);
  });

  it('exports SandboxDesiredState constants and stable literals', () => {
    expect(main.SandboxDesiredRunning).toBe('running');
    expect(main.SandboxDesiredStopped).toBe('stopped');
    expect(main.SandboxDesiredDeleted).toBe('deleted');

    const desired: SandboxDesiredState[] = [
      SandboxDesiredRunning,
      SandboxDesiredStopped,
      SandboxDesiredDeleted,
    ];
    expect(desired).toEqual(['running', 'stopped', 'deleted']);
  });
});

describe('EngineCapability sandboxes (5097a18)', () => {
  it('exports EngineCapabilitySandboxes alongside egress_gateway', () => {
    expect(main.EngineCapabilitySandboxes).toBe('sandboxes');
    expect(EngineCapabilitySandboxes).toBe('sandboxes');
    expect(EngineCapabilityEgressGateway).toBe('egress_gateway');
  });

  it('accepts sandboxes in capability unions for scheduler matching', () => {
    const caps: EngineCapability[] = [
      EngineCapabilityEgressGateway,
      EngineCapabilitySandboxes,
    ];
    expect(caps).toEqual(['egress_gateway', 'sandboxes']);
  });
});

describe('sandbox entitlement gate (5097a18)', () => {
  it('exports ResourceFeatureSandboxes for invitation-gated teams', () => {
    expect(ResourceFeatureSandboxes).toBe('feature:sandboxes');
    expect(main.ResourceFeatureSandboxes).toBe('feature:sandboxes');
  });
});

describe('SandboxDTO placement fields (96453ff)', () => {
  it('types running sandboxes with generation and engine/worker placement', () => {
    const running: Pick<
      SandboxDTO,
      | 'name'
      | 'desired_state'
      | 'status'
      | 'generation'
      | 'engine_id'
      | 'worker_id'
      | 'remote_id'
    > = {
      name: 'dev-box',
      desired_state: SandboxDesiredRunning,
      status: SandboxStatusRunning,
      generation: 2,
      engine_id: 'eng_abc',
      worker_id: 'wrk_xyz',
      remote_id: 'rem_stable',
    };

    expect(running.generation).toBe(2);
    expect(running.engine_id).toBe('eng_abc');
    expect(running.worker_id).toBe('wrk_xyz');
  });

  it('allows pending sandboxes without engine_id or worker_id', () => {
    const pending: Pick<SandboxDTO, 'status' | 'generation' | 'engine_id' | 'worker_id'> = {
      status: SandboxStatusPending,
      generation: 0,
    };
    expect(pending.engine_id).toBeUndefined();
    expect(pending.worker_id).toBeUndefined();
  });

  it('accepts CreateSandboxRequest sizing overrides for POST /sandboxes', () => {
    const req: CreateSandboxRequest = {
      name: 'ci-sandbox',
      vcpus: 4,
      memory_mib: 8192,
      disk_mib: 20480,
    };
    expect(req).toEqual({
      name: 'ci-sandbox',
      vcpus: 4,
      memory_mib: 8192,
      disk_mib: 20480,
    });
  });

  it('pins generation and optional engine_id/worker_id on SandboxDTO in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    const dtoBlock = (() => {
      const start = source.indexOf('export interface SandboxDTO');
      expect(start).toBeGreaterThanOrEqual(0);
      return source.slice(start, start + 900);
    })();

    expect(dtoBlock).toMatch(/generation: number \/\* int64 \*\//);
    expect(dtoBlock).toMatch(/engine_id\?: string;/);
    expect(dtoBlock).toMatch(/worker_id\?: string;/);
    expect(dtoBlock).toMatch(/Generation counts starts, restarts included/);
    expect(dtoBlock).toMatch(/empty while[\s\S]*pending or stopped/);
  });
});
