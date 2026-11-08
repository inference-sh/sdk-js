import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  SandboxDesiredStopped,
  SandboxStatusStopped,
  VisibilityPrivate,
  type SandboxDTO,
  type StartSandboxRequest,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');
const sandboxesClientSource = readFileSync(join(__dirname, '../api/sandboxes.ts'), 'utf8');

const baseSandbox = {
  id: 'sb-1',
  short_id: 'sb-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  user_id: 'user-1',
  team_id: 'team-1',
  visibility: VisibilityPrivate,
  name: 'dev',
  image: 'inference/belt:latest',
  vcpus: 2,
  memory_mib: 4096,
  disk_mib: 10240,
  desired_state: SandboxDesiredStopped,
  status: SandboxStatusStopped,
  generation: 3,
} as const;

/**
 * Types regen 4cee75e (INF-1163): stopped-sandbox disk retention on the engine
 * and optional fresh_disk on POST /sandboxes/{id}/start.
 */
describe('StartSandboxRequest fresh_disk (4cee75e / INF-1163)', () => {
  it('types fresh_disk as optional on the start body', () => {
    const defaultStart: StartSandboxRequest = {};
    const wipe: StartSandboxRequest = { fresh_disk: true };
    const keep: StartSandboxRequest = { fresh_disk: false };
    expect(defaultStart.fresh_disk).toBeUndefined();
    expect(wipe.fresh_disk).toBe(true);
    expect(keep.fresh_disk).toBe(false);
  });

  it('documents StartSandboxRequest and fresh_disk in types.ts', () => {
    expect(typesSource).toMatch(/export interface StartSandboxRequest \{/);
    expect(typesSource).toMatch(/fresh_disk\?: boolean;/);
    expect(typesSource).toMatch(/POST \/sandboxes\/\{id\}\/start/);
    expect(typesSource).toMatch(/INF-1163/);
    expect(typesSource).toMatch(/FreshDisk starts the stopped sandbox on a new, empty disk/);
  });
});

describe('SandboxDTO disk_kept fields (4cee75e / INF-1163)', () => {
  it('requires disk_kept and allows disk_kept_until for stopped sandboxes', () => {
    const kept: SandboxDTO = {
      ...baseSandbox,
      stopped_at: '2026-01-02T12:00:00Z',
      disk_kept: true,
      disk_kept_until: '2026-01-09T12:00:00Z',
    };
    const released: SandboxDTO = {
      ...baseSandbox,
      disk_kept: false,
    };
    expect(kept.disk_kept).toBe(true);
    expect(kept.disk_kept_until).toMatch(/2026-01-09/);
    expect(released.disk_kept).toBe(false);
    expect(released.disk_kept_until).toBeUndefined();
  });

  it('documents disk_kept and disk_kept_until on SandboxDTO in types.ts', () => {
    expect(typesSource).toMatch(/disk_kept: boolean;/);
    expect(typesSource).toMatch(/disk_kept_until\?: string \/\* RFC3339 \*\//);
    expect(typesSource).toMatch(/DiskKept: the engine the sandbox last ran on keeps its disk/);
    expect(typesSource).toMatch(/stopped_at \+ 7 days/);
  });
});

describe('sandbox disk types export surface (4cee75e)', () => {
  it('exports SandboxDTO-related types from the main types module', () => {
    const start: main.StartSandboxRequest = { fresh_disk: true };
    expect(start.fresh_disk).toBe(true);
  });

  it('SandboxesAPI.start posts without a body until the client accepts StartSandboxRequest', () => {
    expect(sandboxesClientSource).toMatch(/async start\(id: string\)/);
    expect(sandboxesClientSource).not.toMatch(/StartSandboxRequest/);
  });
});
