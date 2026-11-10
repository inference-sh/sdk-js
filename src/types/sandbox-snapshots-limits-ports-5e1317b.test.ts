import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EngineCapabilitySandboxSnapshots,
  EnforcementBlock,
  EnforcementWarn,
  ResourceSandboxKeptDisks,
  ResourceSandboxSnapshots,
  SandboxSnapshotFailed,
  SandboxSnapshotPending,
  SandboxSnapshotReady,
  type CreateSandboxRequest,
  type CreateSandboxSnapshotRequest,
  type EngineCapability,
  type ForkSandboxRequest,
  type ForkSandboxResponse,
  type ResourceUsage,
  type SandboxLimitsDTO,
  type SandboxPortDTO,
  type SandboxPortRequest,
  type SandboxSnapshotDTO,
  type SandboxSnapshotStatus,
  type StartSandboxRequest,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');
const sandboxesClientSource = readFileSync(join(__dirname, '../api/sandboxes.ts'), 'utf8');

/**
 * Types regen 5e1317b: GET /sandboxes/limits, port exposure, disk snapshots and
 * forks (INF-1251), image upgrade on start, and from_snapshot_id on create.
 */
describe('sandbox snapshots, limits, ports, and image upgrade (5e1317b)', () => {
  it('exports EngineCapabilitySandboxSnapshots and includes it in the capability union', () => {
    expect(EngineCapabilitySandboxSnapshots).toBe('sandbox_snapshots');
    expect(main.EngineCapabilitySandboxSnapshots).toBe('sandbox_snapshots');
    const caps: EngineCapability[] = [EngineCapabilitySandboxSnapshots];
    expect(caps).toEqual(['sandbox_snapshots']);
    expect(typesSource).toMatch(/\| "sandbox_snapshots";/);
    expect(typesSource).toMatch(/EngineCapabilitySandboxSnapshots: EngineCapability = "sandbox_snapshots"/);
    expect(typesSource).toMatch(/WsSandboxStartPayload\.FromSnapshotID/);
  });

  it('exports ResourceSandboxSnapshots separately from kept-disk warn-only limits', () => {
    expect(ResourceSandboxSnapshots).toBe('sandbox_snapshots');
    expect(main.ResourceSandboxSnapshots).toBe('sandbox_snapshots');
    expect(ResourceSandboxKeptDisks).toBe('sandbox_kept_disks');
    expect(ResourceSandboxSnapshots).not.toBe(ResourceSandboxKeptDisks);
    expect(typesSource).toMatch(
      /ResourceSandboxSnapshots is how many sandbox snapshots a team keeps/,
    );
    expect(typesSource).toMatch(/\| "sandbox_kept_disks"\s*\n\s*\| "sandbox_snapshots"/);
  });

  it('types SandboxLimitsDTO with ResourceUsage rows and per-dimension SandboxRange', () => {
    const limits: SandboxLimitsDTO = {
      limits: [
        {
          resource: 'sandboxes',
          label: 'Sandboxes',
          type: 'limit',
          usage: 2,
          limit: 10,
          unlimited: false,
          enabled: true,
          mode: EnforcementBlock,
        },
        {
          resource: ResourceSandboxSnapshots,
          label: 'Snapshots',
          unit: 'count',
          type: 'limit',
          usage: 1,
          limit: 5,
          unlimited: false,
          enabled: true,
          mode: EnforcementWarn,
        },
      ],
      vcpus_per_sandbox: { default: 2, max: 8 },
      memory_mib: { default: 4096, max: 16384 },
      disk_mib: { default: 20_480, max: 102_400 },
      idle_timeout_default: 900,
      idle_timeout_min: 0,
      idle_timeout_max: 2_592_000,
      disk_kept_for: 604_800,
    };
    const usageRow: ResourceUsage = limits.limits[0];
    expect(usageRow.mode).toBe('block');
    expect(limits.vcpus_per_sandbox.max).toBe(8);
    expect(limits.idle_timeout_default).toBe(900);
    expect(typesSource).toMatch(/SandboxLimitsDTO answers GET \/sandboxes\/limits/);
    expect(typesSource).toMatch(/limits: ResourceUsage\[\]/);
    expect(typesSource).toMatch(/vcpus_per_sandbox: SandboxRange/);
  });

  it('types CreateSandboxRequest.from_snapshot_id and StartSandboxRequest.upgrade_image', () => {
    const fromSnapshot: CreateSandboxRequest = {
      name: 'restored',
      from_snapshot_id: 'snap-1',
    };
    expect(fromSnapshot.from_snapshot_id).toBe('snap-1');

    const upgradeStart: StartSandboxRequest = { fresh_disk: true, upgrade_image: true };
    expect(upgradeStart.upgrade_image).toBe(true);
    expect(typesSource).toMatch(/from_snapshot_id\?: string;/);
    expect(typesSource).toMatch(/upgrade_image\?: boolean;/);
    expect(typesSource).toMatch(/FromSnapshotID starts the sandbox on a copy of a ready snapshot/);
    expect(typesSource).toMatch(/UpgradeImage moves the stopped sandbox to the server's current/);
  });

  it('types sandbox port open/list DTOs for public vs private URLs', () => {
    const open: SandboxPortRequest = { port: 8080, public: true };
    const privatePort: SandboxPortRequest = { port: 3000 };
    expect(open.port).toBe(8080);
    expect(privatePort.public).toBeUndefined();

    const listed: SandboxPortDTO = {
      port: 8080,
      public: false,
      url: 'https://sb.example/p/8080?token=abc',
      created_at: '2026-11-10T12:00:00Z',
    };
    expect(listed.url).toContain('token=');
    expect(typesSource).toMatch(/POST \/sandboxes\/\{id\}\/ports/);
    expect(typesSource).toMatch(/SandboxPortList is GET \/sandboxes\/\{id\}\/ports/);
    expect(typesSource).toMatch(/Port is the TCP port inside the box, 1-65535/);
  });

  it('types snapshot lifecycle constants and SandboxSnapshotDTO fields', () => {
    const statuses: SandboxSnapshotStatus[] = [
      SandboxSnapshotPending,
      SandboxSnapshotReady,
      SandboxSnapshotFailed,
    ];
    expect(statuses).toEqual(['pending', 'ready', 'failed']);
    expect(main.SandboxSnapshotReady).toBe('ready');

    const snap: SandboxSnapshotDTO = {
      id: 'snap-1',
      created_at: '2026-11-10T12:00:00Z',
      updated_at: '2026-11-10T12:00:00Z',
      short_id: 's-1',
      user_id: 'user-1',
      team_id: 'team-1',
      name: 'before-migrate',
      sandbox_id: 'sb-1',
      image: 'box:24',
      vcpus: 4,
      memory_mib: 8192,
      disk_mib: 40_960,
      bytes: 12_000_000,
      status: SandboxSnapshotReady,
      ready_at: '2026-11-10T12:05:00Z',
      for_fork: false,
    };
    expect(snap.status).toBe('ready');
    expect(snap.image).toBe('box:24');

    const createBody: CreateSandboxSnapshotRequest = { name: 'checkpoint' };
    expect(createBody.name).toBe('checkpoint');
    expect(typesSource).toMatch(/CreateSandboxSnapshotRequest is POST \/sandboxes\/\{id\}\/snapshots/);
  });

  it('types fork request optional count/keep_snapshot and partial ForkSandboxResponse', () => {
    const fork: ForkSandboxRequest = {
      name: 'experiment',
      count: 3,
      idle_timeout_seconds: 1800,
      keep_snapshot: true,
    };
    expect(fork.keep_snapshot).toBe(true);

    const response: ForkSandboxResponse = {
      sandboxes: [{ id: 'sb-f1', name: 'experiment-1' } as ForkSandboxResponse['sandboxes'][number]],
      snapshot_id: 'snap-fork',
      error: 'plan limit: only 1 fork created',
    };
    expect(response.snapshot_id).toBe('snap-fork');
    expect(response.error).toMatch(/plan limit/);
    expect(typesSource).toMatch(/ForkSandboxRequest is POST \/sandboxes\/\{id\}\/fork/);
    expect(typesSource).toMatch(/keep_snapshot\?: boolean;/);
  });

  it('documents ResourceUsage enforcement mode on types.ts', () => {
    expect(typesSource).toMatch(/ResourceUsage shows current usage vs limit/);
    expect(typesSource).toMatch(/mode\?: EnforcementMode;/);
    expect(typesSource).toMatch(/export type EnforcementMode = "block" \| "warn";/);
  });
});

describe('sandbox snapshots client surface (5e1317b)', () => {
  it('exports snapshot and limits symbols from the main barrel', () => {
    expect(main.ResourceSandboxSnapshots).toBe('sandbox_snapshots');
    expect(main.SandboxSnapshotPending).toBe('pending');
    const body: main.SandboxPortRequest = { port: 443 };
    expect(body.port).toBe(443);
  });

  it('SandboxesAPI has no limits/ports/snapshots/fork helpers until the client wires them', () => {
    expect(sandboxesClientSource).not.toMatch(/\/limits|limits\(/);
    expect(sandboxesClientSource).not.toMatch(/\/ports|listPorts|openPort/);
    expect(sandboxesClientSource).not.toMatch(/\/snapshots|createSnapshot|listSnapshots/);
    expect(sandboxesClientSource).not.toMatch(/\/fork|fork\(/);
    expect(sandboxesClientSource).not.toMatch(/SandboxLimitsDTO|ForkSandboxRequest/);
  });
});
