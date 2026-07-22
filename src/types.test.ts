import {
  APIError,
  EntitlementErrorMeta,
  EntitlementTypeBoolean,
  PlanDTO,
  PlanLimits,
  PlanTypeAddon,
  PlanTypeBase,
  ResourceFeatureSeedance,
  ResourceSeats,
  SubscriptionDTO,
  SubscriptionIntervalMonthly,
  SubscriptionStatusActive,
} from './types';

function makePlan(overrides: Partial<PlanDTO> = {}): PlanDTO {
  return {
    id: 'plan-1',
    short_id: 'p1',
    created_at: '2026-07-22T00:00:00Z',
    updated_at: '2026-07-22T00:00:00Z',
    name: 'Pro',
    description: 'Pro plan',
    display_order: 1,
    active: true,
    plan_type: PlanTypeBase,
    credits_monthly: 1000,
    limits: {},
    ...overrides,
  };
}

describe('EntitlementErrorMeta', () => {
  it('models limit entitlement errors with upgrade and add-on purchase hints', () => {
    const meta: EntitlementErrorMeta = {
      resource: ResourceSeats,
      resource_label: 'Team seats',
      limit: 5,
      current: 5,
      upgrade_available: true,
      addon_plan_id: 'plan-addon-seats',
      addon_plan_name: 'Extra Seats',
      addon_plan_price: 1000,
    };

    expect(meta.resource).toBe('seats');
    expect(meta.limit).toBe(5);
    expect(meta.current).toBe(5);
    expect(meta.upgrade_available).toBe(true);
    expect(meta.addon_plan_name).toBe('Extra Seats');
  });

  it('models boolean feature gate errors without limit counters', () => {
    const meta: EntitlementErrorMeta = {
      resource: ResourceFeatureSeedance,
      resource_label: 'Seedance video',
      upgrade_available: false,
    };

    expect(meta.resource).toBe('feature:seedance');
    expect(meta.limit).toBeUndefined();
    expect(meta.current).toBeUndefined();
    expect(meta.upgrade_available).toBe(false);
    expect(meta.addon_plan_id).toBeUndefined();
  });

  it('preserves structured meta on APIError responses after JSON round-trip', () => {
    const meta: EntitlementErrorMeta = {
      resource: ResourceSeats,
      resource_label: 'Team seats',
      limit: 10,
      current: 10,
      upgrade_available: true,
      addon_plan_id: 'plan-addon-seats',
      addon_plan_name: 'Extra Seats',
      addon_plan_price: 1500,
    };
    const error: APIError = {
      code: 'entitlement_limit_exceeded',
      message: 'Seat limit reached',
      meta,
    };

    const parsed = JSON.parse(JSON.stringify(error)) as APIError;
    const parsedMeta = parsed.meta as EntitlementErrorMeta;

    expect(parsedMeta.resource).toBe('seats');
    expect(parsedMeta.limit).toBe(10);
    expect(parsedMeta.current).toBe(10);
    expect(parsedMeta.upgrade_available).toBe(true);
    expect(parsedMeta.addon_plan_price).toBe(1500);
  });
});

describe('PlanDTO required_plan_names', () => {
  it('allows add-on plans to declare human-readable prerequisite plan names', () => {
    const addon: PlanDTO = makePlan({
      id: 'plan-addon-seats',
      name: 'Extra Seats',
      plan_type: PlanTypeAddon,
      required_plan_ids: ['plan-base-pro'],
      required_plan_names: ['Pro'],
    });

    expect(addon.required_plan_ids).toEqual(['plan-base-pro']);
    expect(addon.required_plan_names).toEqual(['Pro']);
  });

  it('allows base plans without required_plan_names', () => {
    const base: PlanDTO = makePlan({
      plan_type: PlanTypeBase,
    });

    expect(base.required_plan_names).toBeUndefined();
  });

  it('preserves required_plan_names on nested plan in SubscriptionDTO responses', () => {
    const subscription: SubscriptionDTO = {
      id: 'sub-1',
      short_id: 's1',
      created_at: '2026-07-22T00:00:00Z',
      updated_at: '2026-07-22T00:00:00Z',
      team_id: 'team-1',
      plan_id: 'plan-addon-seats',
      plan: makePlan({
        id: 'plan-addon-seats',
        plan_type: PlanTypeAddon,
        required_plan_ids: ['plan-base-pro', 'plan-base-team'],
        required_plan_names: ['Pro', 'Team'],
      }),
      interval: SubscriptionIntervalMonthly,
      status: SubscriptionStatusActive,
      current_period_start: '2026-07-01T00:00:00Z',
      current_period_end: '2026-08-01T00:00:00Z',
      cancel_at_period_end: false,
      credits_per_period: 500,
    };

    const parsed = JSON.parse(JSON.stringify(subscription)) as SubscriptionDTO;

    expect(parsed.plan?.required_plan_names).toEqual(['Pro', 'Team']);
  });

  it('allows required_plan_names alongside PlanLimits entitlement keys', () => {
    const limits: PlanLimits = {
      seats: {
        type: EntitlementTypeBoolean,
        enabled: true,
      },
    };

    const addon: PlanDTO = makePlan({
      plan_type: PlanTypeAddon,
      required_plan_ids: ['plan-base-pro'],
      required_plan_names: ['Pro'],
      limits,
    });

    expect(addon.required_plan_names).toEqual(['Pro']);
    expect(addon.limits.seats?.enabled).toBe(true);
  });
});
