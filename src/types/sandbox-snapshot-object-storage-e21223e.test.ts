import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EngineCapabilitySandboxSnapshotStore,
  EngineCapabilitySandboxSnapshots,
  SandboxSnapshotStoreFailed,
  SandboxSnapshotStorePending,
  SandboxSnapshotStoreStored,
  SandboxSnapshotStoreUploading,
  SandboxSnapshotReady,
  type EngineCapability,
  type SandboxSnapshotDTO,
  type SandboxSnapshotStoreStatus,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen e21223e (api#2342): engines with sandbox_snapshot_store upload
 * snapshot copies to object storage; SandboxSnapshotDTO reports store progress.
 */
describe('sandbox snapshot object storage (e21223e / api#2342)', () => {
  it('exports EngineCapabilitySandboxSnapshotStore beside disk-copy snapshots', () => {
    expect(EngineCapabilitySandboxSnapshots).toBe('sandbox_snapshots');
    expect(EngineCapabilitySandboxSnapshotStore).toBe('sandbox_snapshot_store');
    expect(main.EngineCapabilitySandboxSnapshotStore).toBe('sandbox_snapshot_store');

    const caps: EngineCapability[] = [
      EngineCapabilitySandboxSnapshots,
      EngineCapabilitySandboxSnapshotStore,
    ];
    expect(caps).toEqual(['sandbox_snapshots', 'sandbox_snapshot_store']);
    expect(typesSource).toMatch(/\| "sandbox_snapshots"\s*\n\s*\| "sandbox_snapshot_store";/);
    expect(typesSource).toMatch(
      /EngineCapabilitySandboxSnapshotStore: EngineCapability = "sandbox_snapshot_store"/,
    );
  });

  it('documents object-store upload and cross-engine FromSnapshot restore', () => {
    expect(typesSource).toMatch(/WsSandboxSnapshotPayload\.Store/);
    expect(typesSource).toMatch(/uploads them in/);
    expect(typesSource).toMatch(/parts through URLs the API presigns/);
    expect(typesSource).toMatch(/it holds no storage credential/);
    expect(typesSource).toMatch(/WsSandboxStartPayload\.FromSnapshot/);
    expect(typesSource).toMatch(/each against the manifest, and rebuilds the disk/);
  });

  it('types SandboxSnapshotStoreStatus lifecycle constants', () => {
    const statuses: SandboxSnapshotStoreStatus[] = [
      SandboxSnapshotStorePending,
      SandboxSnapshotStoreUploading,
      SandboxSnapshotStoreStored,
      SandboxSnapshotStoreFailed,
    ];
    expect(statuses).toEqual(['pending', 'uploading', 'stored', 'failed']);
    expect(main.SandboxSnapshotStoreStored).toBe('stored');
    expect(typesSource).toMatch(/SandboxSnapshotStoreStatus is where keeping a snapshot in object storage/);
    expect(typesSource).toMatch(/stands \(EngineCapabilitySandboxSnapshotStore\)/);
  });

  it('types SandboxSnapshotDTO store_status and stored_bytes for durable copies', () => {
    const engineOnly: SandboxSnapshotDTO = {
      id: 'snap-local',
      created_at: '2026-11-11T06:00:00Z',
      updated_at: '2026-11-11T06:05:00Z',
      short_id: 's-l',
      user_id: 'user-1',
      team_id: 'team-1',
      name: 'local-checkpoint',
      sandbox_id: 'sb-1',
      image: 'box:24',
      vcpus: 2,
      memory_mib: 4096,
      disk_mib: 20_480,
      bytes: 8_000_000,
      status: SandboxSnapshotReady,
      ready_at: '2026-11-11T06:05:00Z',
    };
    expect(engineOnly.store_status).toBeUndefined();
    expect(engineOnly.stored_bytes).toBeUndefined();

    const stored: SandboxSnapshotDTO = {
      ...engineOnly,
      id: 'snap-durable',
      name: 'durable-checkpoint',
      store_status: SandboxSnapshotStoreStored,
      stored_bytes: 1_250_000,
    };
    expect(stored.store_status).toBe('stored');
    expect(stored.stored_bytes).toBe(1_250_000);

    expect(typesSource).toMatch(/store_status\?: SandboxSnapshotStoreStatus;/);
    expect(typesSource).toMatch(/stored_bytes\?: number \/\* int64 \*\/;/);
    expect(typesSource).toMatch(
      /StoreStatus is where keeping it in object storage stands: empty when/,
    );
    expect(typesSource).toMatch(/it is kept on its engine alone\. Stored,/);
    expect(typesSource).toMatch(/StoredBytes is/);
    expect(typesSource).toMatch(/what the stored copy holds \(compressed\)/);
  });
});
