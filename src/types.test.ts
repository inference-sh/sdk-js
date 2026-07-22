import {
  EntitlementTypeBoolean,
  PlanDTO,
  PlanLimits,
  PlanTypeAddon,
  PlanTypeBase,
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

describe('PlanDTO required_plan_ids', () => {
  it('allows add-on plans to declare prerequisite base plan IDs', () => {
    const basePlanId = 'plan-base-pro';
    const addon: PlanDTO = makePlan({
      id: 'plan-addon-seats',
      name: 'Extra Seats',
      plan_type: PlanTypeAddon,
      required_plan_ids: [basePlanId],
    });

    expect(addon.plan_type).toBe('addon');
    expect(addon.required_plan_ids).toEqual([basePlanId]);
  });

  it('allows base plans without required_plan_ids', () => {
    const base: PlanDTO = makePlan({
      plan_type: PlanTypeBase,
    });

    expect(base.plan_type).toBe('base');
    expect(base.required_plan_ids).toBeUndefined();
  });

  it('preserves required_plan_ids on nested plan in SubscriptionDTO responses', () => {
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
      }),
      interval: SubscriptionIntervalMonthly,
      status: SubscriptionStatusActive,
      current_period_start: '2026-07-01T00:00:00Z',
      current_period_end: '2026-08-01T00:00:00Z',
      cancel_at_period_end: false,
      credits_per_period: 500,
    };

    const parsed = JSON.parse(JSON.stringify(subscription)) as SubscriptionDTO;

    expect(parsed.plan?.required_plan_ids).toEqual(['plan-base-pro', 'plan-base-team']);
  });

  it('allows required_plan_ids alongside PlanLimits entitlement keys', () => {
    const limits: PlanLimits = {
      seats: {
        type: EntitlementTypeBoolean,
        enabled: true,
      },
    };

    const addon: PlanDTO = makePlan({
      plan_type: PlanTypeAddon,
      required_plan_ids: ['plan-base-pro'],
      limits,
    });

    expect(addon.required_plan_ids).toEqual(['plan-base-pro']);
    expect(addon.limits.seats?.enabled).toBe(true);
  });
});
