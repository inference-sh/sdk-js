import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  PermInspect,
  PermRead,
  PermWrite,
  PermInteract,
  PermUse,
  type Permission,
  type ResourceShareDTO,
  type ShareRequest,
  type TaskDTO,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 7d83a9e: PermInspect for task runtime internals; TaskDTO docs
 * describe withoutInternals redaction for callers lacking inspect.
 */
describe('task inspect permission and TaskDTO redaction docs (7d83a9e)', () => {
  it('exports PermInspect from types and the main barrel', () => {
    expect(PermInspect).toBe('inspect');
    expect(main.PermInspect).toBe('inspect');
  });

  it('keeps Permission literals stable including inspect for ACL shares', () => {
    const perms: Permission[] = [
      PermRead,
      PermWrite,
      PermInteract,
      PermUse,
      PermInspect,
    ];
    expect(perms).toEqual(['read', 'write', 'interact', 'use', 'inspect']);

    const share: Pick<ShareRequest, 'permission'> = { permission: PermInspect };
    const grant: Pick<ResourceShareDTO, 'permission'> = { permission: PermInspect };
    expect(share.permission).toBe('inspect');
    expect(grant.permission).toBe('inspect');
  });

  it('types TaskDTO fields referenced by withoutInternals redaction', () => {
    const redacted: Pick<
      TaskDTO,
      | 'infra'
      | 'workers'
      | 'logs'
      | 'usage_events'
      | 'webhook'
      | 'setup'
      | 'engine'
      | 'worker'
      | 'egress'
      | 'session_id'
    > = {
      infra: {},
      workers: [],
      logs: [],
      usage_events: [],
      webhook: undefined,
      setup: undefined,
      engine: undefined,
      worker: undefined,
      egress: undefined,
      session_id: undefined,
    };

    expect(redacted.infra).toEqual({});
    expect(redacted.workers).toEqual([]);
    expect(redacted.logs).toEqual([]);
  });

  it('documents PermInspect and task.withoutInternals in types.ts', () => {
    expect(typesSource).toMatch(
      /export type Permission =\s*\n\s*\| "read"\s*\n\s*\| "write"\s*\n\s*\| "interact"\s*\n\s*\| "use"\s*\n\s*\| "inspect";/
    );
    expect(typesSource).toMatch(/export const PermInspect: Permission = "inspect";/);
    expect(typesSource).toMatch(/PermInspect reads a row's runtime internals/);
    expect(typesSource).toMatch(/task\.withoutInternals/);
    expect(typesSource).toMatch(/shared\.PermInspect/);
    expect(typesSource).toMatch(
      /logs, workers and usage_events null, infra empty/
    );
    expect(typesSource).toMatch(/Swift\s*\n \* SDK's infra/);
  });
});
