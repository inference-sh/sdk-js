import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';
import { TaskStatusRejected } from './types.js';

const root = join(__dirname, '..');

/**
 * Release 1a1855a / 67fe059: v0.29.1 ships TaskStatusRejected (admission
 * refused) and credential/requirements type regen from the API.
 */
describe('release v0.29.1 (1a1855a)', () => {
  it('ships version 0.29.1 while 0.29.0 remains documented in CHANGELOG', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.29.1');
    expect(SDK_VERSION).toBe('0.29.1');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[0\.29\.0\] - 2026-10-17/);
    expect(changelog).toMatch(/`CredentialConfigDTO\.provider_info` is gone/);
  });

  it('exports TaskStatusRejected for admission-refused runs', () => {
    expect(TaskStatusRejected).toBe(13);
  });
});

describe('source guards for v0.29.1 behavior (67fe059)', () => {
  it('tasks client rejects watches when status is TaskStatusRejected', () => {
    const tasksSource = readFileSync(join(__dirname, 'api', 'tasks.ts'), 'utf8');
    expect(tasksSource).toMatch(/case TaskStatusRejected:/);
    expect(tasksSource).toMatch(/task rejected/);
  });

  it('parseStatus and isTerminalStatus treat rejected as terminal', () => {
    const utilsSource = readFileSync(join(__dirname, 'utils.ts'), 'utf8');
    expect(utilsSource).toMatch(/rejected: TaskStatusRejected/);
    expect(utilsSource).toMatch(/parsed === TaskStatusRejected/);
  });

  it('generated types include requirements_not_met and credential scheme metadata', () => {
    const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
    expect(typesSource).toMatch(/export const TaskStatusRejected: TaskStatus = 13/);
    expect(typesSource).toMatch(/export const ErrorCodeRequirementsNotMet: ErrorCode = "requirements_not_met"/);
    expect(typesSource).toMatch(/display_name\?: string;[\s\S]*connection_scope\?: CredentialScope;[\s\S]*expires_after_days\?: number/);
    expect(typesSource).toMatch(/export interface CredentialRequirement/);
    expect(typesSource).toMatch(/export interface SecretFieldConfig[\s\S]*pattern\?: string;/);
    expect(typesSource).toMatch(/export interface CredentialConfigDTO[\s\S]*instructions\?: string;/);
    expect(typesSource).toMatch(/export interface CredentialConfigDTO[\s\S]*expires_after_days\?: number/);
  });
});
