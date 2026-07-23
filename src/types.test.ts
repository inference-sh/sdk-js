import {
  APIError,
  AppPricing,
  AppStoreListingDTO,
  EnforcementBlock,
  EntitlementDTO,
  EntitlementErrorMeta,
  EntitlementSourceAddon,
  EntitlementSourceTier,
  EntitlementTypeBoolean,
  EntitlementTypeLimit,
  EstimateCostRequest,
  EstimateCostResponse,
  PlanDTO,
  PlanLimits,
  PlanPriceDTO,
  PlanTypeAddon,
  PlanTypeBase,
  RefRouteDTO,
  RefRouteModeRedirect,
  RefRouteModeRewrite,
  RefRouteTypeApp,
  ResourceFeatureSeedance,
  ResourceSeats,
  ScopeAgentsRead,
  ScopeAppsRead,
  ScopeAppsWrite,
  ScopeGroupApps,
  ScopePreset,
  ScopesResponse,
  SubscriptionDTO,
  SubscriptionIntervalMonthly,
  SubscriptionIntervalYearly,
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
    stackable: false,
    limits: {},
    ...overrides,
  };
}

function makePlanPrice(overrides: Partial<PlanPriceDTO> = {}): PlanPriceDTO {
  return {
    id: 'price-1',
    short_id: 'pp1',
    created_at: '2026-07-23T00:00:00Z',
    updated_at: '2026-07-23T00:00:00Z',
    plan_id: 'plan-1',
    amount: 2900,
    interval: SubscriptionIntervalMonthly,
    provider_price_id: 'price_stripe_monthly',
    active: true,
    ...overrides,
  };
}

function makeAppPricing(overrides: Partial<AppPricing> = {}): AppPricing {
  return {
    prices: { default: 1000 },
    resource_expression: 'prices.default',
    inference_expression: '0',
    royalty_expression: '0',
    partner_expression: '0',
    total_expression: 'prices.default',
    description: 'Flat rate',
    ...overrides,
  };
}

function makeEntitlement(overrides: Partial<EntitlementDTO> = {}): EntitlementDTO {
  return {
    id: 'ent-1',
    short_id: 'e1',
    created_at: '2026-07-22T00:00:00Z',
    updated_at: '2026-07-22T00:00:00Z',
    team_id: 'team-1',
    resource: ResourceSeats,
    type: EntitlementTypeLimit,
    enabled: true,
    unlimited: false,
    limit: 10,
    source: EntitlementSourceTier,
    enforcement: EnforcementBlock,
    ...overrides,
  };
}

function makeStoreListing(overrides: Partial<AppStoreListingDTO> = {}): AppStoreListingDTO {
  return {
    id: 'listing-1',
    created_at: '2026-07-22T00:00:00Z',
    updated_at: '2026-07-22T00:00:00Z',
    category: 'video',
    is_featured: false,
    rank: 100,
    allows_private_workers: true,
    allows_cloud_workers: true,
    max_concurrency: 4,
    max_concurrency_per_team: 2,
    min_concurrency: 1,
    ...overrides,
  };
}

describe('regenerated type constants and DTO shapes', () => {
  it('exports ResourceFeatureSeedance for seedance video feature gating', () => {
    expect(ResourceFeatureSeedance).toBe('feature:seedance');
  });

  it('exports RefRouteMode constants for rewrite and redirect routing', () => {
    expect(RefRouteModeRewrite).toBe('rewrite');
    expect(RefRouteModeRedirect).toBe('redirect');
  });

  it('accepts rewrite and redirect modes on RefRouteDTO responses', () => {
    const base = {
      id: 'route-1',
      short_id: 'rt1',
      created_at: '2026-07-21T00:00:00Z',
      updated_at: '2026-07-21T00:00:00Z',
      type: RefRouteTypeApp,
      alias_ref: '@acme/alias',
      target_ref: '@acme/target',
      primary: true,
      description: 'Primary route',
      enabled: true,
    };

    const rewriteRoute: RefRouteDTO = { ...base, mode: RefRouteModeRewrite };
    const redirectRoute: RefRouteDTO = { ...base, mode: RefRouteModeRedirect };

    expect(rewriteRoute.mode).toBe('rewrite');
    expect(redirectRoute.mode).toBe('redirect');
  });

  it('allows matching AppStoreListingDTO required_feature against ResourceFeatureSeedance', () => {
    const listing: AppStoreListingDTO = {
      id: 'listing-1',
      created_at: '2026-07-21T00:00:00Z',
      updated_at: '2026-07-21T00:00:00Z',
      category: 'video',
      is_featured: false,
      rank: 1,
      allows_private_workers: true,
      allows_cloud_workers: true,
      max_concurrency: 1,
      max_concurrency_per_team: 1,
      min_concurrency: 1,
      required_feature: ResourceFeatureSeedance,
    };

    expect(listing.required_feature).toBe('feature:seedance');
  });

  it('allows ResourceFeatureSeedance as a PlanLimits entitlement key', () => {
    const limits: PlanLimits = {
      [ResourceFeatureSeedance]: {
        type: EntitlementTypeBoolean,
        enabled: true,
      },
    };

    expect(limits[ResourceFeatureSeedance]?.enabled).toBe(true);
  });
});

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

describe('EstimateCostRequest/Response', () => {
  it('models estimate requests with input payload and optional function name', () => {
    const request: EstimateCostRequest = {
      input: { prompt: 'hello', max_tokens: 256 },
      function: 'generate',
    };

    expect(request.input).toEqual({ prompt: 'hello', max_tokens: 256 });
    expect(request.function).toBe('generate');
  });

  it('models exact-confidence responses with microcents total', () => {
    const response: EstimateCostResponse = {
      confidence: 'exact',
      microcents: 2500,
      pricing_description: '$0.0025 per run',
    };

    expect(response.confidence).toBe('exact');
    expect(response.microcents).toBe(2500);
    expect(response.min).toBeUndefined();
    expect(response.max).toBeUndefined();
  });

  it('models range-confidence responses with min/max and depends_on hints', () => {
    const response: EstimateCostResponse = {
      confidence: 'range',
      min: 1000,
      max: 5000,
      depends_on: ['output_tokens', 'model_tier'],
      pricing_description: 'Depends on output length',
    };

    expect(response.confidence).toBe('range');
    expect(response.min).toBe(1000);
    expect(response.max).toBe(5000);
    expect(response.depends_on).toEqual(['output_tokens', 'model_tier']);
    expect(response.microcents).toBeUndefined();
  });

  it('models unknown-confidence responses when pricing is output-dependent', () => {
    const response: EstimateCostResponse = {
      confidence: 'unknown',
      pricing_description: 'Cost varies with generated content',
    };

    expect(response.confidence).toBe('unknown');
    expect(response.microcents).toBeUndefined();
    expect(response.min).toBeUndefined();
    expect(response.max).toBeUndefined();
    expect(response.depends_on).toBeUndefined();
  });

  it('preserves estimate request/response shapes after JSON round-trip', () => {
    const request: EstimateCostRequest = {
      input: { image_url: 'https://example.com/a.png' },
    };
    const response: EstimateCostResponse = {
      confidence: 'range',
      min: 500,
      max: 2000,
      depends_on: ['output_resolution'],
      pricing_description: 'Resolution-dependent',
    };

    const parsedRequest = JSON.parse(JSON.stringify(request)) as EstimateCostRequest;
    const parsedResponse = JSON.parse(JSON.stringify(response)) as EstimateCostResponse;

    expect(parsedRequest.input.image_url).toBe('https://example.com/a.png');
    expect(parsedResponse.confidence).toBe('range');
    expect(parsedResponse.depends_on).toEqual(['output_resolution']);
  });
});

describe('AppPricing estimate fields', () => {
  it('marks input-based pricing as estimable without a custom estimate expression', () => {
    const pricing = makeAppPricing({
      estimable: true,
      description_rendered: '$0.001 per request',
    });

    expect(pricing.estimable).toBe(true);
    expect(pricing.estimate).toBeUndefined();
  });

  it('allows a CEL estimate expression when post-execution data affects pricing', () => {
    const pricing = makeAppPricing({
      estimable: false,
      estimate: '{"min": prices.default, "max": prices.default * 10}',
      description_rendered: 'From $0.001 depending on output',
    });

    expect(pricing.estimable).toBe(false);
    expect(pricing.estimate).toContain('min');
  });

  it('preserves estimate and estimable on AppPricing after JSON round-trip', () => {
    const pricing = makeAppPricing({
      estimable: false,
      estimate: 'prices.default * task_inputs.batch_size',
    });

    const parsed = JSON.parse(JSON.stringify(pricing)) as AppPricing;

    expect(parsed.estimable).toBe(false);
    expect(parsed.estimate).toBe('prices.default * task_inputs.batch_size');
    expect(parsed.prices.default).toBe(1000);
  });
});

describe('ScopePreset summary and hidden', () => {
  it('supports summary bullets for preset scope overviews in the UI', () => {
    const preset: ScopePreset = {
      id: 'read-only',
      label: 'Read only',
      description: 'View resources without making changes',
      scopes: [ScopeAppsRead, ScopeAgentsRead],
      summary: ['View apps and agents', 'No write or execute permissions'],
    };

    expect(preset.summary).toEqual([
      'View apps and agents',
      'No write or execute permissions',
    ]);
    expect(preset.hidden).toBeUndefined();
  });

  it('supports hidden presets excluded from default UI listings', () => {
    const preset: ScopePreset = {
      id: 'legacy-full-access',
      label: 'Legacy full access',
      description: 'Internal compatibility preset',
      scopes: [],
      hidden: true,
    };

    expect(preset.hidden).toBe(true);
    expect(preset.summary).toBeUndefined();
  });

  it('preserves summary and hidden on presets nested in ScopesResponse', () => {
    const response: ScopesResponse = {
      scopes: [
        {
          value: ScopeAppsRead,
          label: 'Read apps',
          description: 'View app metadata',
          group: ScopeGroupApps,
        },
      ],
      groups: [
        {
          id: ScopeGroupApps,
          label: 'Apps',
          description: 'App store resources',
        },
      ],
      presets: [
        {
          id: 'developer',
          label: 'Developer',
          description: 'Build and run apps',
          scopes: [ScopeAppsRead, ScopeAppsWrite],
          summary: ['Read and write apps'],
          hidden: false,
        },
        {
          id: 'internal-admin',
          label: 'Internal admin',
          description: 'Hidden admin preset',
          scopes: [],
          hidden: true,
        },
      ],
    };

    const parsed = JSON.parse(JSON.stringify(response)) as ScopesResponse;

    expect(parsed.presets[0].summary).toEqual(['Read and write apps']);
    expect(parsed.presets[0].hidden).toBe(false);
    expect(parsed.presets[1].hidden).toBe(true);
    expect(parsed.presets[1].summary).toBeUndefined();
  });
});

describe('EntitlementDTO team_plan_id', () => {
  it('links add-on sourced entitlements to the purchased team plan record', () => {
    const entitlement = makeEntitlement({
      resource: ResourceSeats,
      source: EntitlementSourceAddon,
      limit: 5,
      team_plan_id: 'team-plan-addon-seats',
    });

    expect(entitlement.source).toBe('addon');
    expect(entitlement.team_plan_id).toBe('team-plan-addon-seats');
    expect(entitlement.limit).toBe(5);
  });

  it('allows tier-sourced entitlements without team_plan_id', () => {
    const entitlement = makeEntitlement({
      source: EntitlementSourceTier,
    });

    expect(entitlement.source).toBe('tier');
    expect(entitlement.team_plan_id).toBeUndefined();
  });

  it('preserves team_plan_id after JSON round-trip', () => {
    const entitlement = makeEntitlement({
      source: EntitlementSourceAddon,
      team_plan_id: 'team-plan-addon-seats',
    });

    const parsed = JSON.parse(JSON.stringify(entitlement)) as EntitlementDTO;

    expect(parsed.source).toBe('addon');
    expect(parsed.team_plan_id).toBe('team-plan-addon-seats');
    expect(parsed.resource).toBe('seats');
  });
});

describe('AppStoreListingDTO required_feature', () => {
  it('declares feature-gated store listings with required_feature', () => {
    const listing = makeStoreListing({
      required_feature: ResourceFeatureSeedance,
      tags: ['video', 'premium'],
    });

    expect(listing.required_feature).toBe('feature:seedance');
    expect(listing.tags).toEqual(['video', 'premium']);
  });

  it('allows public listings without required_feature', () => {
    const listing = makeStoreListing();

    expect(listing.required_feature).toBeUndefined();
  });

  it('preserves required_feature after JSON round-trip', () => {
    const listing = makeStoreListing({
      required_feature: ResourceFeatureSeedance,
      is_featured: true,
      rank: 1,
    });

    const parsed = JSON.parse(JSON.stringify(listing)) as AppStoreListingDTO;

    expect(parsed.required_feature).toBe('feature:seedance');
    expect(parsed.is_featured).toBe(true);
    expect(parsed.rank).toBe(1);
  });
});

describe('EstimateCostResponse estimate_error', () => {
  it('captures evaluation failures when an estimate expression exists but cannot run', () => {
    const response: EstimateCostResponse = {
      confidence: 'unknown',
      estimate_error: 'CEL evaluation failed: undefined variable "output_tokens"',
      pricing_description: 'Cost depends on generated output',
    };

    expect(response.confidence).toBe('unknown');
    expect(response.estimate_error).toContain('output_tokens');
    expect(response.microcents).toBeUndefined();
    expect(response.min).toBeUndefined();
    expect(response.max).toBeUndefined();
  });

  it('allows estimate_error alongside range confidence when min/max cannot be computed', () => {
    const response: EstimateCostResponse = {
      confidence: 'range',
      estimate_error: 'division by zero in estimate expression',
      depends_on: ['output_tokens'],
      pricing_description: 'Output-dependent pricing',
    };

    expect(response.confidence).toBe('range');
    expect(response.estimate_error).toContain('division by zero');
    expect(response.min).toBeUndefined();
    expect(response.max).toBeUndefined();
  });

  it('preserves estimate_error through JSON round-trip', () => {
    const response: EstimateCostResponse = {
      confidence: 'unknown',
      estimate_error: 'timeout evaluating estimate expression',
      pricing_description: 'Unable to estimate upfront',
    };

    const parsed = JSON.parse(JSON.stringify(response)) as EstimateCostResponse;

    expect(parsed.estimate_error).toBe('timeout evaluating estimate expression');
    expect(parsed.confidence).toBe('unknown');
  });
});

describe('PlanDTO stackable', () => {
  it('marks base plans as non-stackable by default', () => {
    const base: PlanDTO = makePlan({
      plan_type: PlanTypeBase,
      stackable: false,
    });

    expect(base.plan_type).toBe('base');
    expect(base.stackable).toBe(false);
  });

  it('allows stackable add-on plans that can be purchased multiple times', () => {
    const addon: PlanDTO = makePlan({
      id: 'plan-addon-seats',
      name: 'Extra Seats',
      plan_type: PlanTypeAddon,
      stackable: true,
      required_plan_ids: ['plan-base-pro'],
    });

    expect(addon.plan_type).toBe('addon');
    expect(addon.stackable).toBe(true);
    expect(addon.required_plan_ids).toEqual(['plan-base-pro']);
  });

  it('preserves stackable on nested plan in SubscriptionDTO responses', () => {
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
        stackable: true,
        required_plan_ids: ['plan-base-pro'],
      }),
      interval: SubscriptionIntervalMonthly,
      status: SubscriptionStatusActive,
      current_period_start: '2026-07-01T00:00:00Z',
      current_period_end: '2026-08-01T00:00:00Z',
      cancel_at_period_end: false,
      credits_per_period: 500,
    };

    const parsed = JSON.parse(JSON.stringify(subscription)) as SubscriptionDTO;

    expect(parsed.plan?.stackable).toBe(true);
    expect(parsed.plan?.plan_type).toBe('addon');
  });
});

describe('PlanPriceDTO and PlanDTO prices', () => {
  it('models monthly and yearly price rows with cents amount and provider IDs', () => {
    const monthly = makePlanPrice({
      id: 'price-monthly',
      interval: SubscriptionIntervalMonthly,
      amount: 2900,
      provider_price_id: 'price_stripe_monthly',
    });
    const yearly = makePlanPrice({
      id: 'price-yearly',
      interval: SubscriptionIntervalYearly,
      amount: 29000,
      provider_price_id: 'price_stripe_yearly',
    });

    expect(monthly.interval).toBe('monthly');
    expect(monthly.amount).toBe(2900);
    expect(yearly.interval).toBe('yearly');
    expect(yearly.amount).toBe(29000);
    expect(yearly.provider_price_id).toBe('price_stripe_yearly');
  });

  it('allows plans to expose multiple active price intervals via prices array', () => {
    const plan = makePlan({
      prices: [
        makePlanPrice({
          id: 'price-monthly',
          interval: SubscriptionIntervalMonthly,
          amount: 2900,
        }),
        makePlanPrice({
          id: 'price-yearly',
          interval: SubscriptionIntervalYearly,
          amount: 29000,
        }),
      ],
    });

    expect(plan.prices).toHaveLength(2);
    expect(plan.prices?.[0]?.interval).toBe('monthly');
    expect(plan.prices?.[1]?.interval).toBe('yearly');
  });

  it('allows plans without prices when pricing is not yet configured', () => {
    const plan = makePlan();

    expect(plan.prices).toBeUndefined();
  });

  it('preserves nested plan prices on SubscriptionDTO responses after JSON round-trip', () => {
    const subscription: SubscriptionDTO = {
      id: 'sub-1',
      short_id: 's1',
      created_at: '2026-07-23T00:00:00Z',
      updated_at: '2026-07-23T00:00:00Z',
      team_id: 'team-1',
      plan_id: 'plan-pro',
      plan: makePlan({
        id: 'plan-pro',
        prices: [
          makePlanPrice({
            id: 'price-monthly',
            plan_id: 'plan-pro',
            interval: SubscriptionIntervalMonthly,
            amount: 4900,
            provider_price_id: 'price_stripe_pro_monthly',
          }),
        ],
      }),
      interval: SubscriptionIntervalMonthly,
      status: SubscriptionStatusActive,
      current_period_start: '2026-07-01T00:00:00Z',
      current_period_end: '2026-08-01T00:00:00Z',
      cancel_at_period_end: false,
      credits_per_period: 1000,
    };

    const parsed = JSON.parse(JSON.stringify(subscription)) as SubscriptionDTO;

    expect(parsed.plan?.prices).toHaveLength(1);
    expect(parsed.plan?.prices?.[0]?.amount).toBe(4900);
    expect(parsed.plan?.prices?.[0]?.interval).toBe('monthly');
    expect(parsed.plan?.prices?.[0]?.provider_price_id).toBe('price_stripe_pro_monthly');
  });

  it('allows inactive price rows alongside active ones for plan catalog responses', () => {
    const plan = makePlan({
      prices: [
        makePlanPrice({ active: true, amount: 2900 }),
        makePlanPrice({
          id: 'price-legacy',
          active: false,
          amount: 1900,
          provider_price_id: 'price_stripe_legacy',
        }),
      ],
    });

    expect(plan.prices?.[0]?.active).toBe(true);
    expect(plan.prices?.[1]?.active).toBe(false);
    expect(plan.prices?.[1]?.amount).toBe(1900);
  });
});
