import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ErrorCodeNotificationsDisabled,
  ErrorCodePurchaseRequired,
  RequireRecentPurchase,
  type EntitlementErrorMeta,
  type FeatureRequirement,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 60f6536: purchase gate (402 purchase_required + EntitlementErrorMeta)
 * and notification preference conflicts (409 notifications_disabled).
 */
describe('purchase gate and notification preference types (60f6536)', () => {
  it('exports purchase_required and notifications_disabled ErrorCode constants from the barrel', () => {
    expect(ErrorCodePurchaseRequired).toBe('purchase_required');
    expect(ErrorCodeNotificationsDisabled).toBe('notifications_disabled');
    expect(main.ErrorCodePurchaseRequired).toBe('purchase_required');
    expect(main.ErrorCodeNotificationsDisabled).toBe('notifications_disabled');
  });

  it('documents purchase_required as a 402 with EntitlementErrorMeta billing hints', () => {
    expect(typesSource).toMatch(/\| "purchase_required"/);
    expect(typesSource).toMatch(
      /export const ErrorCodePurchaseRequired: ErrorCode = "purchase_required";/,
    );
    expect(typesSource).toMatch(/EntitlementErrorMeta\.WithinDays days/);
    expect(typesSource).toMatch(/billing_page\?: string;/);
    expect(typesSource).toMatch(/within_days\?: number \/\* int \*\//);
  });

  it('exports FeatureRequirement recent_purchase for shared.RequireRecentPurchase gates', () => {
    expect(RequireRecentPurchase).toBe('recent_purchase');
    expect(main.RequireRecentPurchase).toBe('recent_purchase');

    const requirements: FeatureRequirement[] = [RequireRecentPurchase];
    expect(requirements).toEqual(['recent_purchase']);
    expect(typesSource).toMatch(/export type FeatureRequirement = "recent_purchase";/);
  });

  it('types EntitlementErrorMeta purchase gate fields for billing UX', () => {
    const meta: EntitlementErrorMeta = {
      resource: 'feature:publish_apps',
      upgrade_available: false,
      requestable: false,
      requirement: RequireRecentPurchase,
      within_days: 30,
      billing_page: '/teams/t-1/billing',
    };
    expect(meta.requirement).toBe('recent_purchase');
    expect(meta.within_days).toBe(30);
    expect(meta.billing_page).toContain('billing');
  });

  it('documents notifications_disabled as a 409 when the recipient opted out', () => {
    expect(typesSource).toMatch(/\| "notifications_disabled"/);
    expect(typesSource).toMatch(
      /export const ErrorCodeNotificationsDisabled: ErrorCode = "notifications_disabled";/,
    );
    expect(typesSource).toMatch(/notification preferences/);
  });
});
