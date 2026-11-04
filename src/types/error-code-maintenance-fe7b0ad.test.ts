import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ErrorCodeAppMaintenance,
  ErrorCodeMaintenance,
  type ErrorCode,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/** types regen fe7b0ad: platform maintenance 503 error code distinct from app_maintenance */
describe('ErrorCodeMaintenance platform drain (fe7b0ad)', () => {
  it('documents ErrorCodeMaintenance and keeps it separate from app_maintenance', () => {
    expect(typesSource).toMatch(/\| "maintenance"/);
    expect(typesSource).toMatch(
      /export const ErrorCodeMaintenance: ErrorCode = "maintenance";/,
    );
    expect(typesSource).toMatch(/platform\.maintenance/);
    expect(typesSource).toMatch(/meta is MaintenanceMeta/);
    expect(typesSource).toMatch(/AppMaintenance \(503, Retry-After\): the owner paused it/);
  });

  it('exports ErrorCodeMaintenance on types and the main barrel', () => {
    expect(ErrorCodeMaintenance).toBe('maintenance');
    expect(main.ErrorCodeMaintenance).toBe('maintenance');
    expect(ErrorCodeAppMaintenance).toBe('app_maintenance');
    expect(ErrorCodeMaintenance).not.toBe(ErrorCodeAppMaintenance);

    const code: ErrorCode = ErrorCodeMaintenance;
    expect(code).toBe('maintenance');
  });
});
