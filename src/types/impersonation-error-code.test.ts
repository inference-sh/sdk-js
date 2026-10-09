import * as main from '../index';
import { ErrorCodeImpersonationReasonRequired } from '../types';

/** types regen 1b2e21a: ErrorCodeImpersonationReasonRequired for admin team impersonation. */
describe('ErrorCode impersonation_reason_required (1b2e21a)', () => {
  it('exports the constant on types and the main barrel', () => {
    expect(ErrorCodeImpersonationReasonRequired).toBe('impersonation_reason_required');
    expect(main.ErrorCodeImpersonationReasonRequired).toBe('impersonation_reason_required');
  });
});
