import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  MaxCPUSlots,
  MaxOvercommit,
  ResourceSandboxKeptDisks,
  ResourceSandboxMaxVCPUs,
  ResourceSandboxStartsPerMin,
  ResourceSandboxVCPUs,
  ResourceSandboxes,
  type CreateSandboxRequest,
  type EngineCapacityPolicy,
  type EngineDTO,
  type EntitlementResource,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 5afc262: sandbox plan entitlement limits and engine capacity
 * policy (POST /engines/{id}/capacity) on EngineDTO.
 */
describe('sandbox plan limits and engine capacity policy (5afc262)', () => {
  it('exports capacity policy bounds from types and the main barrel', () => {
    expect(MaxOvercommit).toBe(8);
    expect(MaxCPUSlots).toBe(1024);
    expect(main.MaxOvercommit).toBe(8);
    expect(main.MaxCPUSlots).toBe(1024);
  });

  it('types EngineDTO.capacity_policy separately from reported capacity', () => {
    const engine: Pick<EngineDTO, 'capacity' | 'capacity_policy'> = {
      capacity: {
        cpus: 8,
        cores: 4,
        memory_bytes: 16_000_000_000,
        disk_bytes: 100_000_000_000,
        disk_free_bytes: 50_000_000_000,
        reserve: { cpus: 0, memory_bytes: 0 },
        allocatable: { cpus: 4, memory_bytes: 8_000_000_000 },
        committed: { cpus: 2, memory_bytes: 4_000_000_000 },
        committed_apps: { cpus: 1, memory_bytes: 2_000_000_000 },
        used: { cpus: 0.5, memory_bytes: 512_000_000 },
      },
      capacity_policy: {
        sandboxes: false,
        cpu_overcommit: 2,
        memory_overcommit: 1.5,
        cpu_slots: 16,
      },
    };
    expect(engine.capacity_policy?.sandboxes).toBe(false);
    expect(engine.capacity_policy?.cpu_slots).toBe(16);
    expect(engine.capacity?.committed_apps?.cpus).toBe(1);
  });

  it('keeps EngineCapacityPolicy fields optional for partial POST bodies', () => {
    const disableSandboxes: EngineCapacityPolicy = { sandboxes: false };
    const overcommitOnly: EngineCapacityPolicy = { cpu_overcommit: 2, memory_overcommit: 2 };
    const slotsOnly: EngineCapacityPolicy = { cpu_slots: 32 };
    expect(disableSandboxes).toEqual({ sandboxes: false });
    expect(overcommitOnly.cpu_overcommit).toBe(2);
    expect(slotsOnly.cpu_slots).toBe(32);
  });

  it('exports sandbox plan limit entitlement resources distinct from aggregate sandboxes counters', () => {
    expect(ResourceSandboxMaxVCPUs).toBe('sandbox_max_vcpus');
    expect(ResourceSandboxStartsPerMin).toBe('sandbox_starts_per_min');
    expect(ResourceSandboxKeptDisks).toBe('sandbox_kept_disks');
    expect(main.ResourceSandboxMaxVCPUs).toBe('sandbox_max_vcpus');
    expect(main.ResourceSandboxStartsPerMin).toBe('sandbox_starts_per_min');
    expect(main.ResourceSandboxKeptDisks).toBe('sandbox_kept_disks');

    const resources: EntitlementResource[] = [
      ResourceSandboxes,
      ResourceSandboxVCPUs,
      ResourceSandboxMaxVCPUs,
      ResourceSandboxStartsPerMin,
      ResourceSandboxKeptDisks,
    ];
    expect(resources).toEqual([
      'sandboxes',
      'sandbox_vcpus',
      'sandbox_max_vcpus',
      'sandbox_starts_per_min',
      'sandbox_kept_disks',
    ]);
    expect(ResourceSandboxMaxVCPUs).not.toBe(ResourceSandboxes);
    expect(ResourceSandboxStartsPerMin).not.toBe(ResourceSandboxVCPUs);
  });

  it('types CreateSandboxRequest sizes against sandbox_max_vcpus plan caps, not fixed max 8', () => {
    const body: CreateSandboxRequest = { name: 'dev', vcpus: 4, memory_mib: 8192 };
    expect(body.vcpus).toBe(4);
    expect(typesSource).toMatch(
      /vcpus\?: number \/\* int \*\/; \/\/ default 2; at most the plan's largest sandbox \(sandbox_max_vcpus\)/,
    );
    expect(typesSource).toMatch(
      /memory_mib\?: number \/\* int64 \*\/; \/\/ default 4096; at most the plan's largest sandbox \(sandbox_max_vcpus\)/,
    );
    expect(typesSource).not.toMatch(/vcpus\?: number.*max 8/);
    expect(typesSource).not.toMatch(/memory_mib\?: number.*max 16384/);
  });

  it('documents POST /engines/{id}/capacity and entitlement literals in types.ts', () => {
    expect(typesSource).toMatch(/capacity_policy\?: EngineCapacityPolicy;/);
    expect(typesSource).toMatch(/POST \/engines\/\{id\}\/capacity/);
    expect(typesSource).toMatch(/Sandboxes false keeps new sandboxes off the engine/);
    expect(typesSource).toMatch(/ResourceSandboxKeptDisks is how many stopped sandboxes may keep/);
    expect(typesSource).toMatch(/\| "sandbox_vcpus"\s*\n\s*\| "sandbox_max_vcpus"/);
    expect(typesSource).toMatch(
      /export const ResourceSandboxStartsPerMin: EntitlementResource = "sandbox_starts_per_min";/,
    );
  });
});
