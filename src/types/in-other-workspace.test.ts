import * as main from '../index.js';
import { ErrorCodeInOtherWorkspace } from '../types.js';
import type { InOtherWorkspaceMeta } from '../types.js';

/** types regen f0d38b5: ErrorCodeInOtherWorkspace + InOtherWorkspaceMeta. */
describe('ErrorCode in_other_workspace (f0d38b5)', () => {
  it('exports the constant on types and the main barrel', () => {
    expect(ErrorCodeInOtherWorkspace).toBe('in_other_workspace');
    expect(main.ErrorCodeInOtherWorkspace).toBe('in_other_workspace');
  });

  it('InOtherWorkspaceMeta carries the target team_id', () => {
    const meta: InOtherWorkspaceMeta = { team_id: 'team_abc' };
    expect(meta.team_id).toBe('team_abc');
  });
});
