import * as main from '../index.js';
import {
  ErrorCodeFileInUse,
  ErrorCodeListingNotLive,
  RunEndReasonContentFlagged,
} from '../types.js';

/** types regen dd4c786 (0.40.0): vault cleanup, store listing, run end reason. */
describe('0.40.0 generated error and run-end exports', () => {
  it('exports ErrorCodeFileInUse for 409 delete-in-use responses', () => {
    expect(ErrorCodeFileInUse).toBe('file_in_use');
    expect(main.ErrorCodeFileInUse).toBe('file_in_use');
  });

  it('exports ErrorCodeListingNotLive for 410 store listing responses', () => {
    expect(ErrorCodeListingNotLive).toBe('listing_not_live');
    expect(main.ErrorCodeListingNotLive).toBe('listing_not_live');
  });

  it('exports RunEndReasonContentFlagged for strict chat guard run ends', () => {
    expect(RunEndReasonContentFlagged).toBe('content_flagged');
    expect(main.RunEndReasonContentFlagged).toBe('content_flagged');
  });
});