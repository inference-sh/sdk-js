import * as main from '../index.js';
import * as types from '../types.js';
import {
  InfraCloud,
  InfraPrivate,
  InfraPrivateFirst,
  type ApiAppRunRequest,
  type Infra,
  type TaskDTO,
} from '../types.js';

/**
 * types regen 343be12 (models v0.8.151): remote harness scheduling dropped from
 * the Infra union; callers must not send infra "remote" on task/app run payloads.
 */
describe('Infra union (343be12 remote harness removed)', () => {
  it('exports Infra constants from types and the main barrel', () => {
    expect(InfraPrivate).toBe('private');
    expect(InfraCloud).toBe('cloud');
    expect(InfraPrivateFirst).toBe('private_first');
    expect(main.InfraPrivate).toBe('private');
    expect(main.InfraCloud).toBe('cloud');
    expect(main.InfraPrivateFirst).toBe('private_first');
  });

  it('keeps Infra as a closed union of private, cloud, and private_first', () => {
    const values: Infra[] = [InfraPrivate, InfraCloud, InfraPrivateFirst];
    expect(values).toEqual(['private', 'cloud', 'private_first']);
  });

  it('does not export InfraRemote after models v0.8.151', () => {
    expect('InfraRemote' in types).toBe(false);
    expect('InfraRemote' in main).toBe(false);
  });

  it('types task and app run payloads with the remaining infra values only', () => {
    const run: ApiAppRunRequest = { input: {}, infra: InfraCloud };
    const task: Pick<TaskDTO, 'infra'> = { infra: InfraPrivateFirst };
    expect(run.infra).toBe('cloud');
    expect(task.infra).toBe('private_first');
  });
});
