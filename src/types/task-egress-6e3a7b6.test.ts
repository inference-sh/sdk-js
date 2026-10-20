import { readFileSync } from 'fs';
import { join } from 'path';
import {
  type TaskDTO,
  type TaskEgress,
  type TaskResultDTO,
} from '../types.js';

/**
 * Task egress metering (6e3a7b6 / models v0.8.123): full TaskDTO responses may
 * include bytes moved through the engine egress gateway when a task ends.
 */
describe('TaskEgress types (6e3a7b6)', () => {
  it('accepts optional egress on TaskDTO (absent when gateway was not used)', () => {
    const without: Pick<TaskDTO, 'egress'> = {};
    const withEgress: Pick<TaskDTO, 'egress'> = {
      egress: { bytes_out: 4096, bytes_in: 8192 },
    };

    expect(without.egress).toBeUndefined();
    expect(withEgress.egress).toEqual({ bytes_out: 4096, bytes_in: 8192 });
  });

  it('keeps byte counters on TaskEgress for quota and usage reporting', () => {
    const egress: TaskEgress = {
      bytes_out: 1_500_000_000,
      bytes_in: 42,
    };
    expect(egress.bytes_out).toBe(1_500_000_000);
    expect(egress.bytes_in).toBe(42);
  });

  it('does not add egress to slim TaskResultDTO run/result payloads', () => {
    const result: TaskResultDTO = {
      id: 'task-1',
      short_id: 't1',
      status: 2,
      status_text: 'completed',
      output: { ok: true },
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect('egress' in result).toBe(false);
  });

  it('keeps TaskEgress and TaskDTO.egress wired in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toMatch(
      /export interface TaskEgress \{\s*bytes_out: number \/\* int64 \*\/;\s*bytes_in: number \/\* int64 \*\/;\s*\}/,
    );
    expect(source).toMatch(
      /export interface TaskDTO extends BaseModelDTO, PermissionModelDTO \{[\s\S]*?egress\?: TaskEgress;/,
    );
    expect(source).not.toMatch(/export interface TaskResultDTO \{[\s\S]*?egress\?:/);
    expect(source).toMatch(/task\.egress|egress gateway/i);
  });
});
