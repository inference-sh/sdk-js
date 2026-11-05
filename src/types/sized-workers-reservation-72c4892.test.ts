import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EngineCapabilityEgressDecide,
  EngineCapabilitySizedSandboxes,
  EngineCapabilitySizedWorkers,
  ResourceFeatureSandboxes,
  ResourceRetentionDays,
  ResourceSandboxes,
  ResourceSandboxVCPUs,
  WorkerKindApp,
  WorkerKindSlot,
  type EngineCapability,
  type EngineCapacity,
  type EntitlementResource,
  type WorkerDTO,
  type WorkerKind,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 72c4892 (INF-1156/1158/1159): sized workers and sandbox
 * placement against engine capacity, reservation pricing entitlements.
 */
describe('sized workers, capacity reservation, and sandbox entitlements (72c4892)', () => {
  it('exports WorkerKind constants from types and the main barrel', () => {
    expect(WorkerKindSlot).toBe('');
    expect(WorkerKindApp).toBe('app');
    expect(main.WorkerKindSlot).toBe('');
    expect(main.WorkerKindApp).toBe('app');
  });

  it('keeps WorkerKind literals stable for slot vs sized app worker rows', () => {
    const kinds: WorkerKind[] = [WorkerKindSlot, WorkerKindApp];
    expect(kinds).toEqual(['', 'app']);
  });

  it('types WorkerDTO sized app worker fields separately from pre-registered slots', () => {
    const sized: Pick<
      WorkerDTO,
      'kind' | 'vcpus' | 'memory_mib' | 'memory_limit_mib' | 'memory_declared_mib'
    > = {
      kind: WorkerKindApp,
      vcpus: 2,
      memory_mib: 4096,
      memory_limit_mib: 4096,
      memory_declared_mib: 8192,
    };
    const slot: Pick<WorkerDTO, 'kind' | 'vcpus' | 'memory_mib'> = {
      kind: WorkerKindSlot,
      vcpus: 0,
      memory_mib: 0,
    };
    expect(sized.kind).toBe('app');
    expect(sized.memory_declared_mib).toBe(8192);
    expect(slot.kind).toBe('');
    expect(slot.vcpus).toBe(0);
  });

  it('extends EngineCapability with sized_sandboxes and sized_workers after egress_decide', () => {
    expect(typesSource).toMatch(/\| "egress_decide"\s*\n\s*\| "sized_sandboxes"\s*\n\s*\| "sized_workers";/);
    expect(typesSource).toMatch(
      /export const EngineCapabilitySizedSandboxes: EngineCapability = "sized_sandboxes";/,
    );
    expect(typesSource).toMatch(
      /export const EngineCapabilitySizedWorkers: EngineCapability = "sized_workers";/,
    );

    const caps: EngineCapability[] = [
      EngineCapabilityEgressDecide,
      EngineCapabilitySizedSandboxes,
      EngineCapabilitySizedWorkers,
    ];
    expect(caps).toEqual(['egress_decide', 'sized_sandboxes', 'sized_workers']);
    expect(main.EngineCapabilitySizedSandboxes).toBe('sized_sandboxes');
    expect(main.EngineCapabilitySizedWorkers).toBe('sized_workers');
  });

  it('types EngineCapacity.committed_apps for app worker vs sandbox box reservation', () => {
    const emptyApps = { cpus: 0, memory_bytes: 0 };
    const capacity: Pick<
      EngineCapacity,
      'cpus' | 'cores' | 'memory_bytes' | 'disk_bytes' | 'disk_free_bytes' | 'reserve' | 'allocatable' | 'committed' | 'committed_apps' | 'used'
    > = {
      cpus: 8,
      cores: 4,
      memory_bytes: 16_000_000_000,
      disk_bytes: 100_000_000_000,
      disk_free_bytes: 50_000_000_000,
      reserve: emptyApps,
      allocatable: emptyApps,
      committed: { cpus: 2, memory_bytes: 4_000_000_000 },
      committed_apps: { cpus: 1.5, memory_bytes: 2_000_000_000 },
      used: { cpus: 0.5, memory_bytes: 512_000_000 },
    };
    expect(capacity.committed_apps.cpus).toBe(1.5);
    expect(capacity.committed.cpus).toBeGreaterThanOrEqual(capacity.committed_apps.cpus);
  });

  it('exports sandbox placement entitlement resources distinct from feature:sandboxes', () => {
    expect(ResourceSandboxes).toBe('sandboxes');
    expect(ResourceSandboxVCPUs).toBe('sandbox_vcpus');
    expect(main.ResourceSandboxes).toBe('sandboxes');
    expect(main.ResourceSandboxVCPUs).toBe('sandbox_vcpus');
    expect(ResourceSandboxes).not.toBe(ResourceFeatureSandboxes);
    expect(ResourceSandboxVCPUs).not.toBe(ResourceRetentionDays);

    const resources: EntitlementResource[] = [ResourceSandboxes, ResourceSandboxVCPUs];
    expect(resources).toEqual(['sandboxes', 'sandbox_vcpus']);
  });

  it('documents INF-1156 capacity, INF-1158 sized sandboxes, and INF-1159 sized workers in types.ts', () => {
    expect(typesSource).toMatch(/workers\.max_app_ram_mib/);
    expect(typesSource).toMatch(/committed_apps: CapacityAmount;/);
    expect(typesSource).toMatch(/SandboxBoxReasonNoRoom/);
    expect(typesSource).toMatch(/RejectionNoRoom/);
    expect(typesSource).toMatch(/EngineRegisterRequest\.SizedWorkers/);
    expect(typesSource).toMatch(/WsTaskRunPayload\.Worker/);
    expect(typesSource).toMatch(/sandboxes\.placement/);
    expect(typesSource).toMatch(/INF-1156/);
    expect(typesSource).toMatch(/INF-1158/);
    expect(typesSource).toMatch(/INF-1159/);
    expect(typesSource).toMatch(/\| "sandboxes"\s*\n\s*\| "sandbox_vcpus"/);
  });
});
