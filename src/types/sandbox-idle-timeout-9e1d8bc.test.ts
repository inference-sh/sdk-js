import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  SandboxDesiredStopped,
  SandboxStatusStopped,
  VisibilityPrivate,
  type CreateSandboxRequest,
  type SandboxDTO,
  type UpdateSandboxRequest,
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
  disk_kept: false,
} as const;

/**
 * Types regen 9e1d8bc (INF-1209): sandbox idle auto-stop via
 * idle_timeout_seconds on create/update and last_activity_at on GET.
 */
describe('CreateSandboxRequest idle_timeout_seconds (9e1d8bc)', () => {
  it('types idle_timeout_seconds as optional on create', () => {
    const defaults: CreateSandboxRequest = { name: 'dev' };
    const neverStop: CreateSandboxRequest = { name: 'long', idle_timeout_seconds: 0 };
    const halfHour: CreateSandboxRequest = { name: 'std', idle_timeout_seconds: 1800 };
    expect(defaults.idle_timeout_seconds).toBeUndefined();
    expect(neverStop.idle_timeout_seconds).toBe(0);
    expect(halfHour.idle_timeout_seconds).toBe(1800);
  });

  it('documents CreateSandboxRequest idle timeout semantics in types.ts', () => {
    expect(typesSource).toMatch(/idle_timeout_seconds\?: number \/\* int \*\//);
    expect(typesSource).toMatch(/Unset is 1800 \(30 minutes\), 0 never stops it/);
    expect(typesSource).toMatch(/60 to\s+\* 2592000 \(30 days\)/);
    expect(typesSource).toMatch(/keepalive\); what/);
    expect(typesSource).toMatch(/exec still running holds it/);
  });
});

describe('UpdateSandboxRequest (9e1d8bc)', () => {
  it('types PATCH body with optional idle_timeout_seconds only', () => {
    const noChange: UpdateSandboxRequest = {};
    const extend: UpdateSandboxRequest = { idle_timeout_seconds: 3600 };
    expect(noChange.idle_timeout_seconds).toBeUndefined();
    expect(extend.idle_timeout_seconds).toBe(3600);
  });

  it('documents UpdateSandboxRequest and activity on change in types.ts', () => {
    expect(typesSource).toMatch(/export interface UpdateSandboxRequest \{/);
    expect(typesSource).toMatch(/PATCH \/sandboxes\/\{id\}/);
    expect(typesSource).toMatch(/Changing it counts\s+\* as activity/);
  });
});

describe('SandboxDTO idle activity fields (9e1d8bc)', () => {
  it('requires idle_timeout_seconds and allows last_activity_at on responses', () => {
    const withActivity: SandboxDTO = {
      ...baseSandbox,
      idle_timeout_seconds: 1800,
      last_activity_at: '2026-01-02T14:30:00Z',
    };
    const noActivityYet: SandboxDTO = {
      ...baseSandbox,
      idle_timeout_seconds: 0,
    };
    expect(withActivity.idle_timeout_seconds).toBe(1800);
    expect(withActivity.last_activity_at).toMatch(/2026-01-02/);
    expect(noActivityYet.last_activity_at).toBeUndefined();
    expect(noActivityYet.idle_timeout_seconds).toBe(0);
  });

  it('documents LastActivityAt and idle stop relative to it on SandboxDTO', () => {
    expect(typesSource).toMatch(/idle_timeout_seconds: number \/\* int \*\//);
    expect(typesSource).toMatch(/last_activity_at\?: string \/\* RFC3339 \*\//);
    expect(typesSource).toMatch(/IdleTimeoutSeconds stops the running box this long after\s+\* LastActivityAt/);
    expect(typesSource).toMatch(/last used through the API, or\s+\* its box started/);
  });

  it('keeps AppSessionDTO idle_timeout separate from sandbox idle_timeout_seconds', () => {
    const appSessionBlock = typesSource.split('export interface AppSessionDTO')[1]!.split('export interface')[0]!;
    expect(appSessionBlock).toMatch(/idle_timeout\?: number \/\* int \*\//);
    expect(appSessionBlock).not.toMatch(/idle_timeout_seconds/);
    const createBlock = typesSource.split('export interface CreateSandboxRequest')[1]!.split('export interface')[0]!;
    expect(createBlock).toMatch(/idle_timeout_seconds\?: number \/\* int \*\//);
  });
});

describe('sandbox idle timeout export surface (9e1d8bc)', () => {
  it('exports UpdateSandboxRequest and create body from the main barrel', () => {
    const patch: main.UpdateSandboxRequest = { idle_timeout_seconds: 600 };
    const create: main.CreateSandboxRequest = { name: 'dev', idle_timeout_seconds: 1800 };
    expect(patch.idle_timeout_seconds).toBe(600);
    expect(create.idle_timeout_seconds).toBe(1800);
  });

  it('SandboxesAPI has no update() until the client wires UpdateSandboxRequest', () => {
    expect(sandboxesClientSource).not.toMatch(/UpdateSandboxRequest/);
    expect(sandboxesClientSource).not.toMatch(/async update\(/);
    expect(sandboxesClientSource).not.toMatch(/patch.*\/sandboxes/i);
  });
});
