import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EngineCapabilityCapacity,
  EngineCapabilityEgressGateway,
  EngineCapabilitySandboxes,
  type CapacityAmount,
  type CapacityGPU,
  type EngineCapability,
  type EngineCapacity,
  type EngineDTO,
} from '../types.js';

/**
 * types regen 1aaf44d (models v0.8.153): engine capacity telemetry (INF-1156)
 * on EngineDTO and EngineCapabilityCapacity for scheduler matching.
 */
describe('EngineCapability capacity (1aaf44d / INF-1156)', () => {
  it('exports EngineCapabilityCapacity from types and the main barrel', () => {
    expect(EngineCapabilityCapacity).toBe('capacity');
    expect(main.EngineCapabilityCapacity).toBe('capacity');
  });

  it('keeps capacity distinct from egress_gateway and sandboxes in capability unions', () => {
    const caps: EngineCapability[] = [
      EngineCapabilityEgressGateway,
      EngineCapabilitySandboxes,
      EngineCapabilityCapacity,
    ];
    expect(caps).toEqual(['egress_gateway', 'sandboxes', 'capacity']);
    expect(new Set(caps).size).toBe(3);
  });
});

describe('EngineCapacity on EngineDTO (1aaf44d)', () => {
  const amount = (cpus: number, memory_bytes: number): CapacityAmount => ({
    cpus,
    memory_bytes,
  });

  it('types optional capacity with reserve, allocatable, committed, and used amounts', () => {
    const gpu: CapacityGPU = { id: 'gpu-0', vram_bytes: 24_000_000_000 };
    const capacity: EngineCapacity = {
      cpus: 32,
      cores: 16,
      memory_bytes: 128_000_000_000,
      disk_bytes: 2_000_000_000_000,
      disk_free_bytes: 1_500_000_000_000,
      gpus: [gpu],
      reserve: amount(2, 8_000_000_000),
      allocatable: amount(30, 120_000_000_000),
      committed: amount(12.5, 64_000_000_000),
      used: amount(8.25, 48_000_000_000),
    };

    const engine: EngineDTO = {
      id: 'eng-cap-1',
      short_id: 'cap1',
      created_at: '2026-10-31T00:00:00Z',
      updated_at: '2026-10-31T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      name: 'capacity-engine',
      api_url: 'http://127.0.0.1:8080',
      status: 'running',
      engine_version: '2.4.1',
      config: {
        id: 'cfg-1',
        name: 'capacity-engine',
        api_url: 'http://127.0.0.1:8080',
        engine_port: '8080',
        workers: { gpu: [], cpu: { count: 4 } },
        api_key: 'secret',
        container_mode: false,
        network_name: 'default',
        cache_path: '/cache',
        gpus: [],
        callback_base_port: 9000,
        engine_internal_api_url: 'http://127.0.0.1:8081',
      },
      capabilities: [EngineCapabilityCapacity],
      capacity,
      workers: [],
    };

    expect(engine.capacity?.used.cpus).toBe(8.25);
    expect(engine.capacity?.gpus?.[0]?.vram_bytes).toBe(gpu.vram_bytes);
    expect(engine.capabilities).toEqual(['capacity']);
  });

  it('documents INF-1156 capacity telemetry in src/types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toContain('EngineCapabilityCapacity');
    expect(source).toContain('INF-1156');
    expect(source).toMatch(/capacity\?: EngineCapacity/);
  });
});
