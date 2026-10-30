import * as main from '../index.js';
import {
  ErrorCodeInOtherWorkspace,
  ErrorCodeTeamRoleRequired,
  type ErrorCode,
  type InOtherWorkspaceMeta,
} from '../types.js';

/** types regen f0d38b5: in_other_workspace error code and InOtherWorkspaceMeta. */
describe('ErrorCode in_other_workspace (f0d38b5)', () => {
  it('exports ErrorCodeInOtherWorkspace on types and the main barrel', () => {
    expect(ErrorCodeInOtherWorkspace).toBe('in_other_workspace');
    expect(main.ErrorCodeInOtherWorkspace).toBe('in_other_workspace');
  });

  it('keeps in_other_workspace distinct from team_role_required for client branching', () => {
    expect(ErrorCodeInOtherWorkspace).not.toBe(ErrorCodeTeamRoleRequired);
    expect(ErrorCodeTeamRoleRequired).toBe('team_role_required');
  });

  it('includes in_other_workspace in the ErrorCode union', () => {
    const code: ErrorCode = ErrorCodeInOtherWorkspace;
    expect(code).toBe('in_other_workspace');
  });

  it('types InOtherWorkspaceMeta with team_id for workspace-switch UX', () => {
    const meta: InOtherWorkspaceMeta = { team_id: 'team_abc123' };
    expect(meta.team_id).toBe('team_abc123');
  });
});
