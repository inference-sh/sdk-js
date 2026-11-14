import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ErrorCodeAccountBanned,
  ErrorCodeAccountDeactivated,
  ErrorCodePublishQuarantined,
  ErrorCodeVisibilityNotAllowed,
  PublishQuarantineFlagged,
  PublishQuarantineNewAccount,
  PublishQuarantineUnverifiedEmail,
  VisibilityPublic,
  VisibilityUnlisted,
  type ErrorCode,
  type PublishQuarantineReason,
  type PublishQuarantinedMeta,
  type Visibility,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen c742cde (COM-8): publish_quarantined (403) when an account
 * may not set public or unlisted visibility yet.
 */
describe('publish quarantine error types (c742cde / COM-8)', () => {
  it('exports ErrorCodePublishQuarantined from types and the main barrel', () => {
    expect(ErrorCodePublishQuarantined).toBe('publish_quarantined');
    expect(main.ErrorCodePublishQuarantined).toBe('publish_quarantined');
  });

  it('keeps publish_quarantined distinct from account and visibility errors', () => {
    const codes: ErrorCode[] = [
      ErrorCodeAccountDeactivated,
      ErrorCodeAccountBanned,
      ErrorCodeVisibilityNotAllowed,
      ErrorCodePublishQuarantined,
    ];
    expect(codes).toEqual([
      'account_deactivated',
      'account_banned',
      'visibility_not_allowed',
      'publish_quarantined',
    ]);
    expect(ErrorCodePublishQuarantined).not.toBe(ErrorCodeAccountBanned);
    expect(ErrorCodePublishQuarantined).not.toBe(ErrorCodeAccountDeactivated);
    expect(ErrorCodePublishQuarantined).not.toBe(ErrorCodeVisibilityNotAllowed);
  });

  it('exports PublishQuarantineReason constants from the main barrel', () => {
    expect(PublishQuarantineNewAccount).toBe('new_account');
    expect(PublishQuarantineUnverifiedEmail).toBe('unverified_email');
    expect(PublishQuarantineFlagged).toBe('flagged');
    expect(main.PublishQuarantineNewAccount).toBe('new_account');
    expect(main.PublishQuarantineUnverifiedEmail).toBe('unverified_email');
    expect(main.PublishQuarantineFlagged).toBe('flagged');
  });

  it('keeps publish quarantine reason literals stable for error meta UX', () => {
    const reasons: PublishQuarantineReason[] = [
      PublishQuarantineNewAccount,
      PublishQuarantineUnverifiedEmail,
      PublishQuarantineFlagged,
    ];
    expect(reasons).toEqual(['new_account', 'unverified_email', 'flagged']);
  });

  it('types PublishQuarantinedMeta for visibility publish UX', () => {
    const newAccount: PublishQuarantinedMeta = {
      resource: 'app',
      visibility: VisibilityPublic as Visibility,
      reason: PublishQuarantineNewAccount,
      until: '2026-11-07T12:00:00Z',
    };
    expect(newAccount.resource).toBe('app');
    expect(newAccount.visibility).toBe('public');
    expect(newAccount.reason).toBe('new_account');
    expect(newAccount.until).toBe('2026-11-07T12:00:00Z');

    const unverified: PublishQuarantinedMeta = {
      resource: 'engine',
      visibility: VisibilityUnlisted as Visibility,
      reason: PublishQuarantineUnverifiedEmail,
    };
    expect(unverified.until).toBeUndefined();
    expect(unverified.reason).toBe('unverified_email');
  });

  it('documents publish_quarantined and PublishQuarantinedMeta in types.ts', () => {
    expect(typesSource).toMatch(/\| "publish_quarantined"/);
    expect(typesSource).toMatch(
      /export const ErrorCodePublishQuarantined: ErrorCode = "publish_quarantined";/,
    );
    expect(typesSource).toMatch(/ErrorCodePublishQuarantined \(403\)/);
    expect(typesSource).toMatch(/abuse\.CheckPublish/);
    expect(typesSource).toMatch(/export type PublishQuarantineReason = "new_account" \| "unverified_email" \| "flagged";/);
    expect(typesSource).toMatch(/export interface PublishQuarantinedMeta \{/);
    expect(typesSource).toMatch(/reason: PublishQuarantineReason;/);
    expect(typesSource).toMatch(/until\?: string \/\* RFC3339 \*\/;/);
    expect(typesSource).toMatch(/PublishQuarantinedMeta; Until says from when a new account can\./);
    expect(typesSource).toMatch(/PublishQuarantinedMeta is the meta of a publish_quarantined error/);
  });
});
