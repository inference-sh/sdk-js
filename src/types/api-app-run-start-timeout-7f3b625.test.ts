import { readFileSync } from 'fs';
import { join } from 'path';
import type { ApiAppRunRequest } from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 7f3b625 (api#2344): queued runs may set start_timeout so a task
 * is cancelled (not billed) when no worker starts within the window.
 */
describe('ApiAppRunRequest.start_timeout (7f3b625 / api#2344)', () => {
  it('types optional start_timeout with run_at scheduling', () => {
    const scheduled: ApiAppRunRequest = {
      app: 'acme/batch',
      input: { id: 1 },
      run_at: '2030-06-01T12:00:00Z',
      start_timeout: 3600,
    };
    expect(scheduled.start_timeout).toBe(3600);
    expect(scheduled.run_at).toBe('2030-06-01T12:00:00Z');
  });

  it('types immediate runs with start_timeout only', () => {
    const immediate: ApiAppRunRequest = {
      app: 'acme/quick',
      input: {},
      start_timeout: 120,
    };
    expect(immediate.start_timeout).toBe(120);
    expect(immediate.run_at).toBeUndefined();
  });

  it('documents StartTimeout semantics beside run_at in types.ts', () => {
    expect(typesSource).toMatch(/export interface ApiAppRunRequest/);
    expect(typesSource).toMatch(/start_timeout\?: number \/\* int \*\/;/);
    expect(typesSource).toMatch(/StartTimeout, in seconds \(1-86400\)/);
    expect(typesSource).toMatch(/counted from run_at when set/);
    expect(typesSource).toMatch(/cancelled, not/);
    expect(typesSource).toMatch(/billed, and leaves the queue/);
    expect(typesSource).toMatch(/Unset, it waits as any task does/);
  });
});
