import * as main from '../index';
import {
  A2UIMcpApp,
  ErrorCodeAlreadyEntitled,
  ErrorCodeAlreadySubmitted,
  ErrorCodeFormClosed,
  ErrorCodeRequestOpen,
  EntitlementRequestAccepted,
  EntitlementRequestDeclined,
  EntitlementRequestOpen,
  EntitlementRequestWithdrawn,
  FormStatusClosed,
  FormStatusDraft,
  FormStatusOpen,
  FormSubmitMany,
  FormSubmitOncePerTeam,
  FormSubmitOncePerUser,
  NotificationTypeEntitlementRequest,
  type EntitlementRequestState,
  type FormStatus,
  type FormSubmitPolicy,
} from '../types';

/**
 * Forms, entitlement requests and MCP Apps (SEP-1865) constants landed in
 * types regen 8c22b7f / 436a4fb (go/api forms + MCP Apps merge).
 */
describe('forms API types (436a4fb)', () => {
  it('exports FormStatus and FormSubmitPolicy constants from the main barrel', () => {
    expect(main.FormStatusDraft).toBe('draft');
    expect(main.FormStatusOpen).toBe('open');
    expect(main.FormStatusClosed).toBe('closed');
    expect(main.FormSubmitOncePerUser).toBe('once_per_user');
    expect(main.FormSubmitOncePerTeam).toBe('once_per_team');
    expect(main.FormSubmitMany).toBe('many');
  });

  it('keeps form lifecycle and submit-policy literals stable for API payloads', () => {
    const statuses: FormStatus[] = [FormStatusDraft, FormStatusOpen, FormStatusClosed];
    expect(statuses).toEqual(['draft', 'open', 'closed']);

    const policies: FormSubmitPolicy[] = [
      FormSubmitOncePerUser,
      FormSubmitOncePerTeam,
      FormSubmitMany,
    ];
    expect(policies).toEqual(['once_per_user', 'once_per_team', 'many']);
  });

  it('exports form conflict ErrorCode constants for closed forms and duplicate submits', () => {
    expect(ErrorCodeFormClosed).toBe('form_closed');
    expect(ErrorCodeAlreadySubmitted).toBe('already_submitted');
    expect(main.ErrorCodeFormClosed).toBe('form_closed');
    expect(main.ErrorCodeAlreadySubmitted).toBe('already_submitted');
  });
});

describe('entitlement request types (436a4fb)', () => {
  it('exports EntitlementRequestState constants from the main barrel', () => {
    expect(main.EntitlementRequestOpen).toBe('open');
    expect(main.EntitlementRequestAccepted).toBe('accepted');
    expect(main.EntitlementRequestDeclined).toBe('declined');
    expect(main.EntitlementRequestWithdrawn).toBe('withdrawn');
  });

  it('keeps entitlement request state literals stable for admin queue filters', () => {
    const states: EntitlementRequestState[] = [
      EntitlementRequestOpen,
      EntitlementRequestAccepted,
      EntitlementRequestDeclined,
      EntitlementRequestWithdrawn,
    ];
    expect(states).toEqual(['open', 'accepted', 'declined', 'withdrawn']);
  });

  it('exports entitlement request conflict ErrorCode constants', () => {
    expect(ErrorCodeAlreadyEntitled).toBe('already_entitled');
    expect(ErrorCodeRequestOpen).toBe('request_open');
    expect(main.ErrorCodeAlreadyEntitled).toBe('already_entitled');
    expect(main.ErrorCodeRequestOpen).toBe('request_open');
  });

  it('exports NotificationTypeEntitlementRequest for admin decision alerts', () => {
    expect(NotificationTypeEntitlementRequest).toBe('entitlement_request');
    expect(main.NotificationTypeEntitlementRequest).toBe('entitlement_request');
  });
});

describe('MCP Apps (8c22b7f / 436a4fb)', () => {
  it('exports A2UIMcpApp component type for SEP-1865 embeds', () => {
    expect(A2UIMcpApp).toBe('McpApp');
    expect(main.A2UIMcpApp).toBe('McpApp');
  });
});
