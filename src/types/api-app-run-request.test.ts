import type { ApiAppRunRequest } from '../types.js';

/**
 * API dcbb5f36b: /apps/run bodies no longer accept task metadata; TaskMetadata
 * and TaskAction were removed from generated types.
 */
describe('ApiAppRunRequest (run requests carry no task metadata)', () => {
  it('does not re-export TaskMetadata or TaskAction from the types module', async () => {
    const types = await import('../types.js');
    expect('TaskMetadata' in types).toBe(false);
    expect('TaskAction' in types).toBe(false);
  });

  it('does not re-export TaskMetadata or TaskAction from the main barrel', async () => {
    const main = await import('../index.js');
    expect('TaskMetadata' in main).toBe(false);
    expect('TaskAction' in main).toBe(false);
  });

  it('rejects a metadata field at compile time (regression guard)', () => {
    const ok: ApiAppRunRequest = { app: 'test-app', input: { prompt: 'hi' } };
    expect(ok.app).toBe('test-app');

    // If `metadata` is added back to ApiAppRunRequest, this assignment type-checks
    // and the unused @ts-expect-error fails the build.
    const bad = {
      app: 'test-app',
      input: {},
      metadata: { action: { key: 'k', on: 'complete' } },
    };
    // @ts-expect-error run requests must not carry task metadata (dcbb5f36b)
    const _rejected: ApiAppRunRequest = bad;
    expect(_rejected).toBeDefined();
  });
});
