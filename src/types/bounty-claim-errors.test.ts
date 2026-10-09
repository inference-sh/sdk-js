import * as main from '../index';
import { ErrorCodeAlreadyClaimed, ErrorCodeAlreadySubmitted } from '../types';

describe('bounty claim and form submit error codes (bb223c3)', () => {
  it('exports ErrorCodeAlreadyClaimed for duplicate bounty claims', () => {
    expect(ErrorCodeAlreadyClaimed).toBe('already_claimed');
    expect(main.ErrorCodeAlreadyClaimed).toBe('already_claimed');
  });

  it('keeps form duplicate-submit ErrorCode separate from bounty already_claimed', () => {
    expect(ErrorCodeAlreadySubmitted).toBe('already_submitted');
    expect(ErrorCodeAlreadyClaimed).toBe('already_claimed');
    expect(ErrorCodeAlreadySubmitted).not.toBe(ErrorCodeAlreadyClaimed);
  });
});
