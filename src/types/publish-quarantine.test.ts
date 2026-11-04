import * as main from '../index.js';
import {
  ErrorCodePublishQuarantined,
  PublishQuarantineNewAccount,
  PublishQuarantineUnverifiedEmail,
  PublishQuarantineFlagged,
} from '../types.js';
import type { PublishQuarantineReason, PublishQuarantinedMeta } from '../types.js';

/** types COM-8: ErrorCodePublishQuarantined, PublishQuarantineReason, PublishQuarantinedMeta */
describe('publish-quarantine types (COM-8)', () => {
  it('exports ErrorCodePublishQuarantined from types and main barrel', () => {
    expect(ErrorCodePublishQuarantined).toBe('publish_quarantined');
    expect(main.ErrorCodePublishQuarantined).toBe('publish_quarantined');
  });

  it('exports PublishQuarantineReason constants from types and main barrel', () => {
    expect(PublishQuarantineNewAccount).toBe('new_account');
    expect(PublishQuarantineUnverifiedEmail).toBe('unverified_email');
    expect(PublishQuarantineFlagged).toBe('flagged');
    expect(main.PublishQuarantineNewAccount).toBe('new_account');
    expect(main.PublishQuarantineUnverifiedEmail).toBe('unverified_email');
    expect(main.PublishQuarantineFlagged).toBe('flagged');
  });

  it('PublishQuarantinedMeta shape is structurally valid', () => {
    const meta: PublishQuarantinedMeta = {
      resource: 'task',
      visibility: 'public',
      reason: 'new_account' as PublishQuarantineReason,
      until: '2026-11-07T18:00:00Z',
    };
    expect(meta.resource).toBe('task');
    expect(meta.reason).toBe('new_account');
    expect(meta.until).toBe('2026-11-07T18:00:00Z');
  });

  it('PublishQuarantinedMeta allows omitting optional until field', () => {
    const meta: PublishQuarantinedMeta = {
      resource: 'app',
      visibility: 'unlisted',
      reason: 'unverified_email' as PublishQuarantineReason,
    };
    expect(meta.until).toBeUndefined();
  });
});
