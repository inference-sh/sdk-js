import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ErrorCodeAdminOriginRequired,
  ErrorCodeAdminRequired,
  ErrorCodeBrowserSessionRequired,
  ErrorCodeInvalidTTL,
  type AdminElevationDropResponse,
  type AdminElevationStatus,
  type ErrorCode,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen f8dce12 (INF-1190): staff browser AdminPower on
 * AdminElevationStatus and AdminOriginRequired when power is used off ADMIN_URL.
 */
describe('admin power status and origin guard (f8dce12 / INF-1190)', () => {
  it('exports ErrorCodeAdminOriginRequired from types and the main barrel', () => {
    expect(ErrorCodeAdminOriginRequired).toBe('admin_origin_required');
    expect(main.ErrorCodeAdminOriginRequired).toBe('admin_origin_required');
  });

  it('keeps admin_origin_required distinct from other elevation error codes', () => {
    const originRequired: ErrorCode = ErrorCodeAdminOriginRequired;
    expect(originRequired).toBe('admin_origin_required');
    expect(originRequired).not.toBe(ErrorCodeBrowserSessionRequired);
    expect(originRequired).not.toBe(ErrorCodeAdminRequired);
    expect(originRequired).not.toBe(ErrorCodeInvalidTTL);
  });

  it('types AdminElevationStatus with admin_power fields for elevate polling UX', () => {
    const activePower: AdminElevationStatus = {
      elevated: false,
      admin_power: true,
      admin_power_until: '2026-11-05T12:00:00Z',
    };
    const withheld: AdminElevationStatus = {
      elevated: true,
      admin_until: '2026-11-05T11:00:00Z',
      admin_power: false,
      admin_power_withheld: 'wrong_origin',
    };
    expect(activePower.admin_power).toBe(true);
    expect(activePower.admin_power_until).toBe('2026-11-05T12:00:00Z');
    expect(withheld.admin_power_withheld).toBe('wrong_origin');
  });

  it('types AdminElevationDropResponse for CLI elevation vs browser staff power', () => {
    const dropped: AdminElevationDropResponse = { elevated: false, dropped: true };
    const nothingToDrop: AdminElevationDropResponse = { elevated: false, dropped: false };
    expect(dropped.dropped).toBe(true);
    expect(nothingToDrop.dropped).toBe(false);
  });

  it('documents AdminPower, AdminOriginRequired, and elevation TTL bounds in types.ts', () => {
    expect(typesSource).toMatch(/admin_power: boolean;/);
    expect(typesSource).toMatch(/admin_power_until\?: string \/\* RFC3339 \*\//);
    expect(typesSource).toMatch(/admin_power_withheld\?: string;/);
    expect(typesSource).toMatch(/AdminPowerWithheld says/);
    expect(typesSource).toMatch(/wrong_origin/);
    expect(typesSource).toMatch(/\| "admin_origin_required"/);
    expect(typesSource).toMatch(
      /export const ErrorCodeAdminOriginRequired: ErrorCode = "admin_origin_required";/,
    );
    expect(typesSource).toMatch(/AdminOriginRequired \(403\)/);
    expect(typesSource).toMatch(/ADMIN_URL/);
    expect(typesSource).toMatch(/INF-1190/);
    expect(typesSource).toMatch(/admin\.elevation\.max_ttl/);
    expect(typesSource).toMatch(/no staff power/);
  });
});
