import {
  APIError,
  AppCategoryOther,
  AppDTO,
  AppPricing,
  AppStatusActive,
  AppStatusDeprecated,
  AppStatusMaintenance,
  AppStatusRetired,
  AddNodePayload,
  AppStoreListingDTO,
  AuthResponse,
  A2UIButton,
  A2UIChart,
  A2UIComponent,
  A2UIForm,
  A2UISurface,
  ActionNodeAdd,
  ActionRedo,
  ActionUndo,
  DeviceAuthInitRequest,
  DeviceAuthPollResponse,
  DeviceAuthStatusApproved,
  DeviceAuthStatusDenied,
  DeviceAuthStatusExpired,
  DeviceAuthStatusInvalid,
  DeviceAuthStatusLoading,
  DeviceAuthStatusPending,
  DeviceAuthStatusValid,
  FlowActionError,
  FlowActionsRequest,
  FlowActionsResponse,
  FlowNodeDataMap,
  FlowNodePosition,
  GateCondition,
  MergeStrategy,
  MergeStrategyConcat,
  MergeStrategyNested,
  MergeStrategyReplace,
  SecretCreateRequest,
  SuggestRequest,
  ToolCallDelta_fieldTags,
  ToolCallFunctionDelta_fieldTags,
  Widget,
  FlowRunDTO,
  GraphNodeStatusCompleted,
  GraphNodeStatusFailed,
  GraphNodeStatusRunning,
  MeStatsResponse,
  StatBuckets,
  SubmitTelemetryRequest,
  TelemetryReportDTO,
  CacheScopePrivate,
  CacheScopePublic,
  DeviceTokenKindAPIKey,
  DeviceTokenKindSession,
  EnforcementBlock,
  EntitlementDTO,
  EntitlementErrorMeta,
  EntitlementSourceAddon,
  EntitlementSourceTier,
  EntitlementTypeBoolean,
  EntitlementTypeLimit,
  EstimateCostRequest,
  EstimateCostResponse,
  KnowledgeDTO,
  KnowledgeLifecycleDecay,
  KnowledgeLifecycleDeprecated,
  KnowledgeLifecycleDraft,
  KnowledgeLifecyclePermanent,
  KnowledgeTypeSkill,
  KnowledgeVersionDTO,
  KnowledgeVersionInput,
  FlowNodeData,
  InfraPrivate,
  SelectorConfig,
  UtilityConfig,
  PlanDTO,
  PlanLimits,
  PlanTypeAddon,
  PlanTypeBase,
  PlanVersionDTO,
  RefRouteDTO,
  RefRouteModeRedirect,
  RefRouteModeRewrite,
  RefRouteTypeApp,
  ResourceFeatureSeedance,
  ResourceSeats,
  ResultMeta,
  ResultTypeComplete,
  ResultTypeInputRequired,
  ScopeAgentsRead,
  ScopeAppsRead,
  ScopeAppsWrite,
  ScopeGroupApps,
  ScopePreset,
  ScopesResponse,
  SkillDTO,
  SubscriptionDTO,
  SubscriptionIntervalMonthly,
  SubscriptionStatusActive,
  ToolCallResponse,
  ToolContentTypeAudio,
  ToolContentTypeImage,
  ToolContentTypeResource,
  ToolContentTypeResourceLink,
  ToolContentTypeText,
  VisibilityPrivate,
  InterruptDTO,
  InterruptReasonToolApproval,
  InterruptReasonHookGate,
  InterruptResourceToolInvocation,
  InterruptResourceHookEvent,
  InterruptStatusPending,
  InterruptStatusResolved,
  InterruptResolutionAllow,
  InterruptResolutionDeny,
  LifecycleHookConfig,
  HookEventToolCall,
  HookHandlerGate,
  HookHandlerWebhook,
  HookEventDefinition,
  HookDecisionSuspend,
} from './types';

function makePlanVersion(overrides: Partial<PlanVersionDTO> = {}): PlanVersionDTO {
  return {
    id: 'plan-ver-1',
    short_id: 'pv1',
    created_at: '2026-07-25T00:00:00Z',
    updated_at: '2026-07-25T00:00:00Z',
    plan_id: 'plan-pro',
    amount_monthly: 2900,
    amount_yearly: 29000,
    provider_price_id_monthly: 'price_stripe_monthly',
    provider_price_id_yearly: 'price_stripe_yearly',
    credits_monthly: 1_000_000,
    active: true,
    ...overrides,
  };
}

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

function makeApp(overrides: Partial<AppDTO> = {}): AppDTO {
  return {
    id: 'app-1',
    short_id: 'a1',
    created_at: '2026-07-23T00:00:00Z',
    updated_at: '2026-07-23T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: 'private',
    namespace: 'acme',
    name: 'demo-app',
    description: 'Demo app',
    agent_description: 'Runs demo tasks',
    category: AppCategoryOther,
    images: { card: '', thumbnail: '', banner: '' },
    version_id: 'ver-1',
    status: AppStatusActive,
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

  it('exports AppStatus constants for app lifecycle states', () => {
    expect(AppStatusActive).toBe('active');
    expect(AppStatusMaintenance).toBe('maintenance');
    expect(AppStatusDeprecated).toBe('deprecated');
    expect(AppStatusRetired).toBe('retired');
  });

  it('preserves AppDTO status, status_message, and status_changed_at through JSON round-trip', () => {
    const app = makeApp({
      status: AppStatusMaintenance,
      status_message: 'Scheduled downtime',
      status_changed_at: '2026-07-23T12:00:00Z',
    });

    const parsed = JSON.parse(JSON.stringify(app)) as AppDTO;

    expect(parsed.status).toBe('maintenance');
    expect(parsed.status_message).toBe('Scheduled downtime');
    expect(parsed.status_changed_at).toBe('2026-07-23T12:00:00Z');
  });

  it('accepts all AppStatus values on AppDTO responses', () => {
    const statuses = [
      AppStatusActive,
      AppStatusMaintenance,
      AppStatusDeprecated,
      AppStatusRetired,
    ] as const;

    for (const status of statuses) {
      const app = makeApp({ status });
      expect(app.status).toBe(status);
    }
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

describe('PlanVersionDTO and PlanDTO active_version', () => {
  it('models monthly and yearly amounts in cents with provider price IDs', () => {
    const version = makePlanVersion({
      amount_monthly: 4900,
      amount_yearly: 49000,
      provider_price_id_monthly: 'price_stripe_pro_monthly',
      provider_price_id_yearly: 'price_stripe_pro_yearly',
    });

    expect(version.amount_monthly).toBe(4900);
    expect(version.amount_yearly).toBe(49000);
    expect(version.provider_price_id_monthly).toBe('price_stripe_pro_monthly');
    expect(version.provider_price_id_yearly).toBe('price_stripe_pro_yearly');
  });

  it('allows plans to expose the active pricing version instead of a prices array', () => {
    const plan = makePlan({
      active_version: makePlanVersion({
        amount_monthly: 2900,
        amount_yearly: 29000,
      }),
    });

    expect(plan.active_version?.amount_monthly).toBe(2900);
    expect(plan.active_version?.amount_yearly).toBe(29000);
    expect(plan.active_version?.active).toBe(true);
  });

  it('allows plans without active_version when pricing is not yet configured', () => {
    const plan = makePlan();

    expect(plan.active_version).toBeUndefined();
  });

  it('preserves nested plan active_version on SubscriptionDTO responses after JSON round-trip', () => {
    const subscription: SubscriptionDTO = {
      id: 'sub-1',
      short_id: 's1',
      created_at: '2026-07-25T00:00:00Z',
      updated_at: '2026-07-25T00:00:00Z',
      team_id: 'team-1',
      plan_id: 'plan-pro',
      plan: makePlan({
        id: 'plan-pro',
        active_version: makePlanVersion({
          plan_id: 'plan-pro',
          amount_monthly: 4900,
          amount_yearly: 49000,
          provider_price_id_monthly: 'price_stripe_pro_monthly',
        }),
      }),
      interval: SubscriptionIntervalMonthly,
      status: SubscriptionStatusActive,
      current_period_start: '2026-07-01T00:00:00Z',
      current_period_end: '2026-08-01T00:00:00Z',
      cancel_at_period_end: false,
      credits_per_period: 1000,
    };

    const parsed = JSON.parse(JSON.stringify(subscription)) as SubscriptionDTO;

    expect(parsed.plan?.active_version?.amount_monthly).toBe(4900);
    expect(parsed.plan?.active_version?.amount_yearly).toBe(49000);
    expect(parsed.plan?.active_version?.provider_price_id_monthly).toBe('price_stripe_pro_monthly');
  });

  it('allows version-specific limits and credits alongside plan-level defaults', () => {
    const limits: PlanLimits = {
      seats: {
        type: EntitlementTypeBoolean,
        enabled: true,
      },
    };

    const plan = makePlan({
      credits_monthly: 500,
      active_version: makePlanVersion({
        credits_monthly: 2_000_000,
        limits,
      }),
    });

    expect(plan.credits_monthly).toBe(500);
    expect(plan.active_version?.credits_monthly).toBe(2_000_000);
    expect(plan.active_version?.limits?.seats?.enabled).toBe(true);
  });

  it('allows inactive plan versions for catalog history responses', () => {
    const version = makePlanVersion({
      active: false,
      amount_monthly: 1900,
      provider_price_id_monthly: 'price_stripe_legacy',
    });

    expect(version.active).toBe(false);
    expect(version.amount_monthly).toBe(1900);
    expect(version.provider_price_id_monthly).toBe('price_stripe_legacy');
  });
});

describe('DeviceAuthInitRequest PKCE and poll responses', () => {
  it('accepts PKCE code_challenge fields on device auth initiation', () => {
    const request: DeviceAuthInitRequest = {
      token_kind: DeviceTokenKindSession,
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      code_challenge_method: 'S256',
    };

    expect(request.token_kind).toBe('session');
    expect(request.code_challenge).toContain('E9Melhoa');
    expect(request.code_challenge_method).toBe('S256');
  });

  it('allows legacy device auth initiation without PKCE or token_kind', () => {
    const request: DeviceAuthInitRequest = {};

    expect(request.token_kind).toBeUndefined();
    expect(request.code_challenge).toBeUndefined();
    expect(request.code_challenge_method).toBeUndefined();
  });

  it('preserves PKCE fields through JSON round-trip', () => {
    const request: DeviceAuthInitRequest = {
      code_challenge: 'challenge-hash',
      code_challenge_method: 'S256',
    };

    const parsed = JSON.parse(JSON.stringify(request)) as DeviceAuthInitRequest;

    expect(parsed.code_challenge).toBe('challenge-hash');
    expect(parsed.code_challenge_method).toBe('S256');
  });

  it('models session-token poll responses for PKCE device auth flows', () => {
    const response: DeviceAuthPollResponse = {
      status: DeviceAuthStatusApproved,
      session_token: 'sess_cli_abc123',
      team_id: 'team-1',
    };

    expect(response.status).toBe('approved');
    expect(response.session_token).toBe('sess_cli_abc123');
    expect(response.api_key).toBeUndefined();
    expect(response.team_id).toBe('team-1');
  });

  it('models legacy api_key poll responses for backward-compatible CLIs', () => {
    const response: DeviceAuthPollResponse = {
      status: DeviceAuthStatusApproved,
      api_key: 'inf_live_legacy',
    };

    expect(response.status).toBe('approved');
    expect(response.api_key).toBe('inf_live_legacy');
    expect(response.session_token).toBeUndefined();
  });

  it('exports DeviceAuthStatus constants for pending, approved, expired, and denied flows', () => {
    expect(DeviceAuthStatusPending).toBe('pending');
    expect(DeviceAuthStatusApproved).toBe('approved');
    expect(DeviceAuthStatusExpired).toBe('expired');
    expect(DeviceAuthStatusDenied).toBe('denied');
  });

  it('exports DeviceAuthStatus constants for client-side validation states', () => {
    expect(DeviceAuthStatusValid).toBe('valid');
    expect(DeviceAuthStatusInvalid).toBe('invalid');
    expect(DeviceAuthStatusLoading).toBe('loading');
  });

  it('models client-side validation states on poll responses', () => {
    const loading: DeviceAuthPollResponse = { status: DeviceAuthStatusLoading };
    const valid: DeviceAuthPollResponse = { status: DeviceAuthStatusValid };
    const invalid: DeviceAuthPollResponse = { status: DeviceAuthStatusInvalid };

    expect(loading.status).toBe('loading');
    expect(valid.status).toBe('valid');
    expect(invalid.status).toBe('invalid');
  });

  it('exports DeviceTokenKind constants for session and legacy API key flows', () => {
    expect(DeviceTokenKindSession).toBe('session');
    expect(DeviceTokenKindAPIKey).toBe('api_key');
  });
});

describe('SkillDTO and KnowledgeDTO usage metrics', () => {
  it('tracks invocation and install counts on SkillDTO responses', () => {
    const skill: SkillDTO = {
      id: 'skill-1',
      short_id: 's1',
      created_at: '2026-07-25T00:00:00Z',
      updated_at: '2026-07-25T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      namespace: 'acme',
      name: 'research',
      description: 'Research assistant skill',
      version_id: 'ver-1',
      uses: 128,
      installs: 42,
    };

    expect(skill.uses).toBe(128);
    expect(skill.installs).toBe(42);
  });

  it('tracks invocation and install counts on KnowledgeDTO responses', () => {
    const knowledge: KnowledgeDTO = {
      id: 'know-1',
      short_id: 'k1',
      created_at: '2026-07-25T00:00:00Z',
      updated_at: '2026-07-25T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      namespace: 'acme',
      name: 'docs',
      description: 'Product documentation',
      type: KnowledgeTypeSkill,
      lifecycle: KnowledgeLifecyclePermanent,
      version_id: 'ver-1',
      uses: 512,
      installs: 17,
    };

    expect(knowledge.uses).toBe(512);
    expect(knowledge.installs).toBe(17);
  });

  it('preserves uses and installs after JSON round-trip', () => {
    const skill: SkillDTO = {
      id: 'skill-1',
      short_id: 's1',
      created_at: '2026-07-25T00:00:00Z',
      updated_at: '2026-07-25T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      namespace: 'acme',
      name: 'research',
      description: 'Research assistant skill',
      version_id: 'ver-1',
      uses: 99,
      installs: 3,
    };

    const parsed = JSON.parse(JSON.stringify(skill)) as SkillDTO;

    expect(parsed.uses).toBe(99);
    expect(parsed.installs).toBe(3);
  });
});

describe('MCP tool call response types', () => {
  it('exports ResultType constants for complete and input-required MRTR results', () => {
    expect(ResultTypeComplete).toBe('complete');
    expect(ResultTypeInputRequired).toBe('input_required');
  });

  it('exports CacheScope constants for MCP result caching', () => {
    expect(CacheScopePublic).toBe('public');
    expect(CacheScopePrivate).toBe('private');
  });

  it('exports ToolContentType constants for all MCP content block kinds', () => {
    expect(ToolContentTypeText).toBe('text');
    expect(ToolContentTypeImage).toBe('image');
    expect(ToolContentTypeAudio).toBe('audio');
    expect(ToolContentTypeResourceLink).toBe('resource_link');
    expect(ToolContentTypeResource).toBe('resource');
  });

  it('models complete ToolCallResponse with text content and server metadata', () => {
    const response: ToolCallResponse = {
      resultType: ResultTypeComplete,
      content: [{ type: ToolContentTypeText, text: 'file contents' }],
      structuredContent: { lines: 3 },
      isError: false,
      _meta: {
        'io.modelcontextprotocol/serverInfo': {
          name: 'filesystem',
          title: 'Filesystem MCP',
          version: '1.0.0',
        },
        cacheScope: CacheScopePrivate,
      },
    };

    expect(response.resultType).toBe('complete');
    expect(response.content[0].text).toBe('file contents');
    expect(response.structuredContent).toEqual({ lines: 3 });
    expect(response._meta?.['io.modelcontextprotocol/serverInfo']?.name).toBe('filesystem');
    expect(response._meta?.cacheScope).toBe('private');
  });

  it('models input_required MRTR ToolCallResponse with inputRequests and requestState', () => {
    const response: ToolCallResponse = {
      resultType: ResultTypeInputRequired,
      content: [],
      isError: false,
      inputRequests: {
        approval: {
          method: 'elicitation/create',
          params: { message: 'Approve transfer of $100?' },
        },
      },
      requestState: 'mrtr-state-1',
    };

    expect(response.resultType).toBe('input_required');
    expect(response.inputRequests?.approval.method).toBe('elicitation/create');
    expect(response.inputRequests?.approval.params).toEqual({ message: 'Approve transfer of $100?' });
    expect(response.requestState).toBe('mrtr-state-1');
  });

  it('allows legacy ToolCallResponse without resultType (implicit complete)', () => {
    const response: ToolCallResponse = {
      content: [{ type: ToolContentTypeText, text: 'legacy output' }],
      isError: false,
    };

    expect(response.resultType).toBeUndefined();
    expect(response.content[0].text).toBe('legacy output');
    expect(response.inputRequests).toBeUndefined();
  });

  it('models resource ToolContent with embedded ResourceContent', () => {
    const response: ToolCallResponse = {
      resultType: ResultTypeComplete,
      content: [
        {
          type: ToolContentTypeResource,
          resource: {
            uri: 'file:///tmp/report.pdf',
            name: 'report.pdf',
            mimeType: 'application/pdf',
            blob: 'JVBERi0xLjQK',
          },
        },
      ],
      isError: false,
    };

    expect(response.content[0].type).toBe('resource');
    expect(response.content[0].resource?.uri).toBe('file:///tmp/report.pdf');
    expect(response.content[0].resource?.mimeType).toBe('application/pdf');
  });

  it('preserves ResultMeta legacy ttlMs and cacheScope after JSON round-trip', () => {
    const meta: ResultMeta = {
      ttlMs: 60_000,
      cacheScope: CacheScopePublic,
      'io.modelcontextprotocol/serverInfo': {
        name: 'demo',
        title: 'Demo MCP',
        version: '0.1.0',
      },
    };

    const parsed = JSON.parse(JSON.stringify(meta)) as ResultMeta;

    expect(parsed.ttlMs).toBe(60_000);
    expect(parsed.cacheScope).toBe('public');
    expect(parsed['io.modelcontextprotocol/serverInfo']?.version).toBe('0.1.0');
  });

  it('preserves input_required ToolCallResponse after JSON round-trip', () => {
    const response: ToolCallResponse = {
      resultType: ResultTypeInputRequired,
      content: [],
      isError: false,
      inputRequests: {
        confirm: {
          method: 'elicitation/create',
          params: { schema: { type: 'object' } },
        },
      },
      requestState: 'state-abc',
    };

    const parsed = JSON.parse(JSON.stringify(response)) as ToolCallResponse;

    expect(parsed.resultType).toBe('input_required');
    expect(parsed.inputRequests?.confirm.params).toEqual({ schema: { type: 'object' } });
    expect(parsed.requestState).toBe('state-abc');
  });
});

describe('InterruptResourceType (trigger enhancements)', () => {
  it('exports resource type constants for tool and hook gate interrupts', () => {
    expect(InterruptResourceToolInvocation).toBe('tool_invocation');
    expect(InterruptResourceHookEvent).toBe('hook_event');
  });

  it('models InterruptDTO with tool_invocation resource_type for tool approval gates', () => {
    const interrupt: InterruptDTO = {
      id: 'int-tool',
      short_id: 'it1',
      created_at: '2026-08-12T00:00:00Z',
      updated_at: '2026-08-12T00:00:00Z',
      user_id: 'u1',
      team_id: 't1',
      visibility: 'team',
      run_id: 'run-1',
      chat_id: 'chat-1',
      reason: InterruptReasonToolApproval,
      source: 'tool:search',
      resource_id: 'call-abc',
      resource_type: InterruptResourceToolInvocation,
      status: InterruptStatusPending,
    };

    const parsed = JSON.parse(JSON.stringify(interrupt)) as InterruptDTO;

    expect(parsed.resource_type).toBe('tool_invocation');
    expect(parsed.resource_id).toBe('call-abc');
    expect(parsed.reason).toBe('tool_approval');
  });

  it('models InterruptDTO with hook_event resource_type for lifecycle hook gates', () => {
    const interrupt: InterruptDTO = {
      id: 'int-hook',
      short_id: 'ih1',
      created_at: '2026-08-12T00:00:00Z',
      updated_at: '2026-08-12T00:00:00Z',
      user_id: 'u1',
      team_id: 't1',
      visibility: 'team',
      run_id: 'run-2',
      chat_id: 'chat-2',
      reason: InterruptReasonHookGate,
      source: 'agent.tool_call',
      resource_id: 'evt-xyz',
      resource_type: InterruptResourceHookEvent,
      status: InterruptStatusPending,
    };

    const parsed = JSON.parse(JSON.stringify(interrupt)) as InterruptDTO;

    expect(parsed.resource_type).toBe('hook_event');
    expect(parsed.source).toBe('agent.tool_call');
    expect(parsed.reason).toBe('hook_gate');
  });
});

describe('gate hook type contracts', () => {
  it('models gate LifecycleHookConfig without handler and with default_resolution', () => {
    const hook: LifecycleHookConfig = {
      event: HookEventToolCall,
      type: HookHandlerGate,
      timeout: 300,
      default_resolution: InterruptResolutionDeny,
    };

    const parsed = JSON.parse(JSON.stringify(hook)) as LifecycleHookConfig;

    expect(parsed.type).toBe('gate');
    expect(parsed.handler).toBeUndefined();
    expect(parsed.timeout).toBe(300);
    expect(parsed.default_resolution).toBe('deny');
  });

  it('models HookEventDefinition with can_gate capability flag', () => {
    const definition: HookEventDefinition = {
      event: HookEventToolCall,
      description: 'Before a tool is invoked',
      can_gate: true,
    };

    const parsed = JSON.parse(JSON.stringify(definition)) as HookEventDefinition;

    expect(parsed.event).toBe('agent.tool_call');
    expect(parsed.can_gate).toBe(true);
  });

  it('exports gate-specific hook decision and handler type constants', () => {
    expect(HookHandlerGate).toBe('gate');
    expect(HookDecisionSuspend).toBe('suspend');
  });

  it('models InterruptDTO with hook_gate reason and resolved_data payload', () => {
    const interrupt: InterruptDTO = {
      id: 'int-1',
      short_id: 'i1',
      created_at: '2026-08-12T00:00:00Z',
      updated_at: '2026-08-12T00:00:00Z',
      user_id: 'u1',
      team_id: 't1',
      visibility: 'team',
      run_id: 'run-1',
      chat_id: 'chat-1',
      reason: InterruptReasonHookGate,
      source: 'agent.tool_call',
      status: InterruptStatusResolved,
      resolution: InterruptResolutionAllow,
      resolved_data: { approved_by: 'user-42', note: 'manual review passed' },
    };

    const parsed = JSON.parse(JSON.stringify(interrupt)) as InterruptDTO;

    expect(parsed.reason).toBe('hook_gate');
    expect(parsed.resolution).toBe('allow');
    expect(parsed.resolved_data).toEqual({
      approved_by: 'user-42',
      note: 'manual review passed',
    });
  });

  it('allows webhook hooks to omit handler in serialized configs', () => {
    const hook: LifecycleHookConfig = {
      event: HookEventToolCall,
      type: HookHandlerWebhook,
      async: true,
    };

    expect(hook.handler).toBeUndefined();
    expect(hook.type).toBe('webhook');
  });
});

describe('Knowledge lifecycle constants (v0.7.86)', () => {
  it('exports draft and deprecated lifecycle values alongside permanent and decay', () => {
    expect(KnowledgeLifecyclePermanent).toBe('permanent');
    expect(KnowledgeLifecycleDecay).toBe('decay');
    expect(KnowledgeLifecycleDraft).toBe('draft');
    expect(KnowledgeLifecycleDeprecated).toBe('deprecated');
  });

  it('models draft and deprecated lifecycle on KnowledgeDTO responses', () => {
    const draft: KnowledgeDTO = {
      id: 'know-draft',
      short_id: 'kd1',
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      namespace: 'acme',
      name: 'wip-notes',
      description: 'Work in progress',
      type: KnowledgeTypeSkill,
      lifecycle: KnowledgeLifecycleDraft,
      version_id: 'ver-1',
      uses: 0,
      installs: 0,
    };

    const deprecated: KnowledgeDTO = {
      ...draft,
      id: 'know-old',
      name: 'legacy-api',
      lifecycle: KnowledgeLifecycleDeprecated,
    };

    expect(draft.lifecycle).toBe('draft');
    expect(deprecated.lifecycle).toBe('deprecated');
  });
});

describe('Knowledge version generated_by actor (v0.7.86)', () => {
  it('models OKF actor on KnowledgeVersionDTO responses', () => {
    const version: KnowledgeVersionDTO = {
      id: 'ver-1',
      short_id: 'v1',
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
      knowledge_id: 'know-1',
      content: { content: 'extracted notes' },
      files: [],
      content_hash: 'abc123',
      description: 'Claude session extraction',
      tags: ['extraction'],
      origin: 'claude-code:853f9a75-session-abc',
      generated_by: 'claude-code/opus-4-6',
    };

    const parsed = JSON.parse(JSON.stringify(version)) as KnowledgeVersionDTO;

    expect(parsed.generated_by).toBe('claude-code/opus-4-6');
    expect(parsed.origin).toBe('claude-code:853f9a75-session-abc');
  });

  it('allows KnowledgeVersionDTO without generated_by for legacy versions', () => {
    const version: KnowledgeVersionDTO = {
      id: 'ver-legacy',
      short_id: 'vl1',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      knowledge_id: 'know-1',
      content: { content: 'manual entry' },
      files: [],
      content_hash: 'legacy-hash',
      description: 'Hand-authored version',
      tags: [],
    };

    expect(version.generated_by).toBeUndefined();
  });

  it('models generated_by on KnowledgeVersionInput for create/update payloads', () => {
    const input: KnowledgeVersionInput = {
      description: 'Human-authored update',
      generated_by: 'human:ok@inference.sh',
    };

    const parsed = JSON.parse(JSON.stringify(input)) as KnowledgeVersionInput;

    expect(parsed.generated_by).toBe('human:ok@inference.sh');
  });
});

describe('flow utility node type contracts (v0.7.86)', () => {
  const baseNodeData = (): FlowNodeData => ({
    app_id: '',
    app_version_id: '',
    infra: InfraPrivate,
    workers: [],
  });

  it('models SelectorConfig with field, mode, and optional index', () => {
    const byIndex: SelectorConfig = {
      field: 'items',
      mode: 'index',
      index: 2,
    };
    const first: SelectorConfig = {
      field: 'results',
      mode: 'first',
    };

    const parsedByIndex = JSON.parse(JSON.stringify(byIndex)) as SelectorConfig;
    const parsedFirst = JSON.parse(JSON.stringify(first)) as SelectorConfig;

    expect(parsedByIndex).toEqual({ field: 'items', mode: 'index', index: 2 });
    expect(parsedFirst).toEqual({ field: 'results', mode: 'first' });
    expect(parsedFirst.index).toBeUndefined();
  });

  it('models UtilityConfig gate preset with nested GateCondition', () => {
    const utility: UtilityConfig = {
      preset: 'gate',
      gate: {
        field: 'approved',
        operator: 'eq',
        value: true,
      },
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.preset).toBe('gate');
    expect(parsed.gate).toEqual({
      field: 'approved',
      operator: 'eq',
      value: true,
    });
  });

  it('models UtilityConfig selector preset with nested SelectorConfig', () => {
    const utility: UtilityConfig = {
      preset: 'selector',
      selector: {
        field: 'candidates',
        mode: 'index',
        index: 0,
      },
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.preset).toBe('selector');
    expect(parsed.selector).toEqual({
      field: 'candidates',
      mode: 'index',
      index: 0,
    });
  });

  it('models UtilityConfig merge preset with constant fallback value', () => {
    const utility: UtilityConfig = {
      preset: 'merge',
      constant: { default: 'fallback' },
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.preset).toBe('merge');
    expect(parsed.constant).toEqual({ default: 'fallback' });
  });

  it('models UtilityConfig custom preset with CEL expression', () => {
    const utility: UtilityConfig = {
      preset: 'custom',
      expression: 'input.score > 0.8 && input.tier == "pro"',
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.preset).toBe('custom');
    expect(parsed.expression).toBe('input.score > 0.8 && input.tier == "pro"');
  });

  it('models FlowNodeData.utility as unified config alongside legacy fields', () => {
    const node: FlowNodeData = {
      ...baseNodeData(),
      utility: {
        preset: 'gate',
        gate: {
          field: 'status',
          operator: 'eq',
          value: 'ready',
        },
      },
      // legacy fields may coexist during migration
      gate_condition: {
        field: 'status',
        operator: 'eq',
        value: 'ready',
      },
      selector_config: {
        field: 'items',
        mode: 'first',
      },
    };

    const parsed = JSON.parse(JSON.stringify(node)) as FlowNodeData;

    expect(parsed.utility?.preset).toBe('gate');
    expect(parsed.utility?.gate?.value).toBe('ready');
    expect(parsed.gate_condition?.field).toBe('status');
    expect(parsed.selector_config?.mode).toBe('first');
  });

  it('allows FlowNodeData without utility for execution nodes', () => {
    const node: FlowNodeData = {
      ...baseNodeData(),
      app_id: 'app-1',
      app_version_id: 'v1',
      function: 'run',
    };

    expect(node.utility).toBeUndefined();
    expect(node.selector_config).toBeUndefined();
  });
});
describe('AuthResponse signup is_new field', () => {
  it('models new-user signup with is_new true for onboarding flows', () => {
    const response: AuthResponse = {
      session_id: 'sess-new-user',
      is_new: true,
      user: {
        id: 'user-new',
        short_id: 'u1',
        created_at: '2026-08-19T00:00:00Z',
        updated_at: '2026-08-19T00:00:00Z',
        default_team_id: 'team-1',
        role: 'member',
        email: 'new@example.com',
        name: 'new',
        full_name: 'New User',
        avatar_url: '',
      },
    };

    const parsed = JSON.parse(JSON.stringify(response)) as AuthResponse;

    expect(parsed.is_new).toBe(true);
    expect(parsed.session_id).toBe('sess-new-user');
    expect(parsed.user?.email).toBe('new@example.com');
  });

  it('models returning-user login without is_new for legacy client compatibility', () => {
    const response: AuthResponse = {
      session_id: 'sess-returning',
      otp_required: false,
    };

    expect(response.is_new).toBeUndefined();
    expect(response.session_id).toBe('sess-returning');
  });

  it('preserves otp_required and redirect_to alongside is_new', () => {
    const response: AuthResponse = {
      session_id: 'sess-otp',
      is_new: false,
      otp_required: true,
      redirect_to: '/verify-otp',
      provider: 'google',
    };

    const parsed = JSON.parse(JSON.stringify(response)) as AuthResponse;

    expect(parsed.is_new).toBe(false);
    expect(parsed.otp_required).toBe(true);
    expect(parsed.redirect_to).toBe('/verify-otp');
    expect(parsed.provider).toBe('google');
  });
});

describe('A2UI component types (HTML removal)', () => {
  it('does not export removed A2UIHTML component type constant', () => {
    const types = require('./types') as Record<string, unknown>;
    expect(types.A2UIHTML).toBeUndefined();
  });

  it('exports Form and Chart component type constants', () => {
    expect(A2UIForm).toBe('Form');
    expect(A2UIChart).toBe('Chart');
  });

  it('models Form component with onSubmitAction and no htmlContent field', () => {
    const component: A2UIComponent = {
      id: 'form-1',
      component: A2UIForm,
      onSubmitAction: { type: 'submit', payload: { formId: 'billing' } },
    };

    const parsed = JSON.parse(JSON.stringify(component)) as A2UIComponent;

    expect(parsed.component).toBe('Form');
    expect(parsed.onSubmitAction?.type).toBe('submit');
    expect(parsed.onSubmitAction?.payload).toEqual({ formId: 'billing' });
    expect('htmlContent' in parsed).toBe(false);
  });

  it('Widget alias still maps to A2UISurface after HTML component removal', () => {
    const surface: A2UISurface = {
      version: '1.0',
      surfaceId: 'surface-form',
      catalogId: 'catalog-1',
      components: [{ id: 'root', component: A2UIButton }],
    };
    const widget: Widget = surface;

    expect(widget.surfaceId).toBe('surface-form');
    expect(widget.components[0].component).toBe('Button');
  });
});

describe('Knowledge version origin provenance (v0.7.74)', () => {
  it('models extraction provenance on KnowledgeVersionDTO responses', () => {
    const version: KnowledgeVersionDTO = {
      id: 'ver-1',
      short_id: 'v1',
      created_at: '2026-08-19T00:00:00Z',
      updated_at: '2026-08-19T00:00:00Z',
      knowledge_id: 'know-1',
      content: { content: 'extracted notes' },
      files: [],
      content_hash: 'abc123',
      description: 'Claude session extraction',
      tags: ['extraction'],
      origin: 'claude:853f9a75-session-abc',
    };

    const parsed = JSON.parse(JSON.stringify(version)) as KnowledgeVersionDTO;

    expect(parsed.origin).toBe('claude:853f9a75-session-abc');
  });

  it('allows KnowledgeVersionDTO without origin for legacy versions', () => {
    const version: KnowledgeVersionDTO = {
      id: 'ver-legacy',
      short_id: 'vl1',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      knowledge_id: 'know-1',
      content: { content: 'manual entry' },
      files: [],
      content_hash: 'legacy-hash',
      description: 'Hand-authored version',
      tags: [],
    };

    expect(version.origin).toBeUndefined();
  });

  it('models origin on KnowledgeVersionInput for create/update payloads', () => {
    const input: KnowledgeVersionInput = {
      description: 'Session extraction',
      origin: 'claude:853f9a75-session-abc',
      scope: ['git:inference-sh/sdk-js'],
    };

    const parsed = JSON.parse(JSON.stringify(input)) as KnowledgeVersionInput;

    expect(parsed.origin).toBe('claude:853f9a75-session-abc');
    expect(parsed.scope).toEqual(['git:inference-sh/sdk-js']);
  });
});

describe('SuggestRequest origin exclusion (v0.7.74)', () => {
  it('models caller origin for deduplicating suggest results', () => {
    const request: SuggestRequest = {
      query: 'go sdk patterns',
      scope: ['git:inference-sh/sdk-js', 'lang:go'],
      origin: 'claude:853f9a75-session-abc',
      limit: 10,
    };

    const parsed = JSON.parse(JSON.stringify(request)) as SuggestRequest;

    expect(parsed.origin).toBe('claude:853f9a75-session-abc');
    expect(parsed.scope).toEqual(['git:inference-sh/sdk-js', 'lang:go']);
  });

  it('allows SuggestRequest without origin for callers that do not track provenance', () => {
    const request: SuggestRequest = {
      query: 'image generation',
      limit: 5,
    };

    expect(request.origin).toBeUndefined();
  });
});

describe('Flow graph undo/redo action types (v0.7.76)', () => {
  it('exports ActionUndo and ActionRedo constants for history navigation', () => {
    expect(ActionUndo).toBe('undo');
    expect(ActionRedo).toBe('redo');
  });

  it('models undo and redo in FlowActionsRequest with empty payloads', () => {
    const request: FlowActionsRequest = {
      actions: [
        { type: ActionUndo, payload: {} },
        { type: ActionRedo, payload: {} },
      ],
    };

    const parsed = JSON.parse(JSON.stringify(request)) as FlowActionsRequest;

    expect(parsed.actions[0].type).toBe('undo');
    expect(parsed.actions[1].type).toBe('redo');
    expect(parsed.actions[0].payload).toEqual({});
    expect(parsed.actions[1].payload).toEqual({});
  });

  it('allows mixing graph mutations with undo in a single actions batch', () => {
    const request: FlowActionsRequest = {
      actions: [
        {
          type: ActionNodeAdd,
          payload: {
            id: 'node-1',
            type: 'task',
            position: { x: 0, y: 0 },
            data: { label: 'Start' },
          },
        },
        { type: ActionUndo, payload: {} },
      ],
    };

    expect(request.actions).toHaveLength(2);
    expect(request.actions[0].type).toBe('node.add');
    expect(request.actions[1].type).toBe('undo');
  });

  it('models FlowActionsResponse with version bump after undo', () => {
    const response: FlowActionsResponse = {
      version: 42,
      actions: [{ type: ActionUndo, payload: {} }],
    };

    const parsed = JSON.parse(JSON.stringify(response)) as FlowActionsResponse;

    expect(parsed.version).toBe(42);
    expect(parsed.actions[0].type).toBe('undo');
    expect(parsed.errors).toBeUndefined();
  });

  it('models FlowActionError when undo or redo cannot be applied', () => {
    const error: FlowActionError = {
      type: 'undo_stack_empty',
      message: 'Nothing to undo',
    };
    const response: FlowActionsResponse = {
      version: 41,
      actions: [{ type: ActionUndo, payload: {} }],
      errors: [error],
    };

    const parsed = JSON.parse(JSON.stringify(response)) as FlowActionsResponse;

    expect(parsed.errors?.[0].type).toBe('undo_stack_empty');
    expect(parsed.errors?.[0].message).toBe('Nothing to undo');
    expect(parsed.version).toBe(41);
  });
});

describe('SecretCreateRequest provider field', () => {
  it('models optional provider for integration-linked secret creation', () => {
    const request: SecretCreateRequest = {
      key: 'GOOGLE_SA_JSON',
      value: '{"type":"service_account"}',
      description: 'Google service account for Drive integration',
      provider: 'google',
    };

    const parsed = JSON.parse(JSON.stringify(request)) as SecretCreateRequest;

    expect(parsed.key).toBe('GOOGLE_SA_JSON');
    expect(parsed.provider).toBe('google');
    expect(parsed.description).toBe('Google service account for Drive integration');
  });

  it('allows SecretCreateRequest without provider for team-scoped secrets', () => {
    const request: SecretCreateRequest = {
      key: 'DB_PASSWORD',
      value: 'super-secret',
    };

    expect(request.provider).toBeUndefined();
    expect(request.description).toBeUndefined();
  });
});

describe('flow gate node type contracts', () => {
  const baseNodeData = (): FlowNodeData => ({
    app_id: '',
    app_version_id: '',
    infra: InfraPrivate,
    workers: [],
  });

  it('models GateCondition with field, operator, and scalar value', () => {
    const condition: GateCondition = {
      field: 'status',
      operator: 'eq',
      value: 'approved',
    };

    const parsed = JSON.parse(JSON.stringify(condition)) as GateCondition;

    expect(parsed.field).toBe('status');
    expect(parsed.operator).toBe('eq');
    expect(parsed.value).toBe('approved');
  });

  it('preserves GateCondition value types through JSON round-trip', () => {
    const cases: GateCondition[] = [
      { field: 'count', operator: 'gte', value: 3 },
      { field: 'enabled', operator: 'eq', value: true },
      { field: 'tags', operator: 'contains', value: ['alpha', 'beta'] },
      { field: 'meta', operator: 'exists', value: { nested: { ok: true } } },
    ];

    for (const condition of cases) {
      const parsed = JSON.parse(JSON.stringify(condition)) as GateCondition;
      expect(parsed).toEqual(condition);
    }
  });

  it('models gate_condition on FlowNodeData for gate nodes only', () => {
    const gateNode: FlowNodeData = {
      ...baseNodeData(),
      gate_condition: {
        field: 'score',
        operator: 'gt',
        value: 0.8,
      },
    };

    const parsed = JSON.parse(JSON.stringify(gateNode)) as FlowNodeData;

    expect(parsed.gate_condition).toEqual({
      field: 'score',
      operator: 'gt',
      value: 0.8,
    });
  });

  it('allows FlowNodeData without gate_condition for non-gate nodes', () => {
    const executionNode: FlowNodeData = {
      ...baseNodeData(),
      app_id: 'app-1',
      app_version_id: 'v1',
      function: 'run',
    };

    expect(executionNode.gate_condition).toBeUndefined();
  });

  it('models AddNodePayload for inserting a gate node with gate_condition', () => {
    const position: FlowNodePosition = { x: 120, y: 240 };
    const payload: AddNodePayload = {
      id: 'gate-1',
      type: 'gate',
      position,
      data: {
        ...baseNodeData(),
        gate_condition: {
          field: 'approved',
          operator: 'eq',
          value: true,
        },
      },
    };

    const parsed = JSON.parse(JSON.stringify(payload)) as AddNodePayload;

    expect(parsed.type).toBe('gate');
    expect(parsed.position).toEqual(position);
    expect(parsed.data.gate_condition).toEqual({
      field: 'approved',
      operator: 'eq',
      value: true,
    });
  });

  it('models FlowNodeDataMap with mixed gate and execution nodes', () => {
    const nodeData: FlowNodeDataMap = {
      'exec-1': {
        ...baseNodeData(),
        app_id: 'app-1',
        app_version_id: 'v1',
      },
      'gate-1': {
        ...baseNodeData(),
        gate_condition: {
          field: 'tier',
          operator: 'eq',
          value: 'pro',
        },
      },
    };

    const parsed = JSON.parse(JSON.stringify(nodeData)) as FlowNodeDataMap;

    expect(parsed['exec-1'].gate_condition).toBeUndefined();
    expect(parsed['gate-1'].gate_condition).toEqual({
      field: 'tier',
      operator: 'eq',
      value: 'pro',
    });
  });
});

describe('Knowledge lifecycle constants (v0.7.86)', () => {
  it('exports draft and deprecated lifecycle values alongside permanent and decay', () => {
    expect(KnowledgeLifecyclePermanent).toBe('permanent');
    expect(KnowledgeLifecycleDecay).toBe('decay');
    expect(KnowledgeLifecycleDraft).toBe('draft');
    expect(KnowledgeLifecycleDeprecated).toBe('deprecated');
  });

  it('models draft and deprecated lifecycle on KnowledgeDTO responses', () => {
    const draft: KnowledgeDTO = {
      id: 'know-draft',
      short_id: 'kd1',
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      namespace: 'acme',
      name: 'wip-notes',
      description: 'Work in progress',
      type: KnowledgeTypeSkill,
      lifecycle: KnowledgeLifecycleDraft,
      version_id: 'ver-1',
      uses: 0,
      installs: 0,
    };

    const deprecated: KnowledgeDTO = {
      ...draft,
      id: 'know-old',
      name: 'legacy-api',
      lifecycle: KnowledgeLifecycleDeprecated,
    };

    expect(draft.lifecycle).toBe('draft');
    expect(deprecated.lifecycle).toBe('deprecated');
  });
});

describe('Knowledge version generated_by actor (v0.7.86)', () => {
  it('models OKF actor on KnowledgeVersionDTO responses', () => {
    const version: KnowledgeVersionDTO = {
      id: 'ver-1',
      short_id: 'v1',
      created_at: '2026-08-20T00:00:00Z',
      updated_at: '2026-08-20T00:00:00Z',
      knowledge_id: 'know-1',
      content: { content: 'extracted notes' },
      files: [],
      content_hash: 'abc123',
      description: 'Claude session extraction',
      tags: ['extraction'],
      origin: 'claude-code:853f9a75-session-abc',
      generated_by: 'claude-code/opus-4-6',
    };

    const parsed = JSON.parse(JSON.stringify(version)) as KnowledgeVersionDTO;

    expect(parsed.generated_by).toBe('claude-code/opus-4-6');
    expect(parsed.origin).toBe('claude-code:853f9a75-session-abc');
  });

  it('allows KnowledgeVersionDTO without generated_by for legacy versions', () => {
    const version: KnowledgeVersionDTO = {
      id: 'ver-legacy',
      short_id: 'vl1',
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
      knowledge_id: 'know-1',
      content: { content: 'manual entry' },
      files: [],
      content_hash: 'legacy-hash',
      description: 'Hand-authored version',
      tags: [],
    };

    expect(version.generated_by).toBeUndefined();
  });

  it('models generated_by on KnowledgeVersionInput for create/update payloads', () => {
    const input: KnowledgeVersionInput = {
      description: 'Human-authored update',
      generated_by: 'human:ok@inference.sh',
    };

    const parsed = JSON.parse(JSON.stringify(input)) as KnowledgeVersionInput;

    expect(parsed.generated_by).toBe('human:ok@inference.sh');
  });
});

describe('flow utility node type contracts (v0.7.86)', () => {
  const baseNodeData = (): FlowNodeData => ({
    app_id: '',
    app_version_id: '',
    infra: InfraPrivate,
    workers: [],
  });

  it('models SelectorConfig with field, mode, and optional index', () => {
    const byIndex: SelectorConfig = {
      field: 'items',
      mode: 'index',
      index: 2,
    };
    const first: SelectorConfig = {
      field: 'results',
      mode: 'first',
    };

    const parsedByIndex = JSON.parse(JSON.stringify(byIndex)) as SelectorConfig;
    const parsedFirst = JSON.parse(JSON.stringify(first)) as SelectorConfig;

    expect(parsedByIndex).toEqual({ field: 'items', mode: 'index', index: 2 });
    expect(parsedFirst).toEqual({ field: 'results', mode: 'first' });
    expect(parsedFirst.index).toBeUndefined();
  });

  it('models UtilityConfig gate preset with nested GateCondition', () => {
    const utility: UtilityConfig = {
      preset: 'gate',
      gate: {
        field: 'approved',
        operator: 'eq',
        value: true,
      },
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.preset).toBe('gate');
    expect(parsed.gate).toEqual({
      field: 'approved',
      operator: 'eq',
      value: true,
    });
  });

  it('models UtilityConfig selector preset with nested SelectorConfig', () => {
    const utility: UtilityConfig = {
      preset: 'selector',
      selector: {
        field: 'candidates',
        mode: 'index',
        index: 0,
      },
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.preset).toBe('selector');
    expect(parsed.selector).toEqual({
      field: 'candidates',
      mode: 'index',
      index: 0,
    });
  });

  it('models UtilityConfig merge preset with constant fallback value', () => {
    const utility: UtilityConfig = {
      preset: 'merge',
      constant: { default: 'fallback' },
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.preset).toBe('merge');
    expect(parsed.constant).toEqual({ default: 'fallback' });
  });

  it('models UtilityConfig custom preset with CEL expression', () => {
    const utility: UtilityConfig = {
      preset: 'custom',
      expression: 'input.score > 0.8 && input.tier == "pro"',
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.preset).toBe('custom');
    expect(parsed.expression).toBe('input.score > 0.8 && input.tier == "pro"');
  });

  it('models FlowNodeData.utility as unified config alongside legacy fields', () => {
    const node: FlowNodeData = {
      ...baseNodeData(),
      utility: {
        preset: 'gate',
        gate: {
          field: 'status',
          operator: 'eq',
          value: 'ready',
        },
      },
      // legacy fields may coexist during migration
      gate_condition: {
        field: 'status',
        operator: 'eq',
        value: 'ready',
      },
      selector_config: {
        field: 'items',
        mode: 'first',
      },
    };

    const parsed = JSON.parse(JSON.stringify(node)) as FlowNodeData;

    expect(parsed.utility?.preset).toBe('gate');
    expect(parsed.utility?.gate?.value).toBe('ready');
    expect(parsed.gate_condition?.field).toBe('status');
    expect(parsed.selector_config?.mode).toBe('first');
  });

  it('allows FlowNodeData without utility for execution nodes', () => {
    const node: FlowNodeData = {
      ...baseNodeData(),
      app_id: 'app-1',
      app_version_id: 'v1',
      function: 'run',
    };

    expect(node.utility).toBeUndefined();
    expect(node.selector_config).toBeUndefined();
  });
});

describe('FlowRunDTO per-node status and outputs (v0.7.97)', () => {
  const baseFlowRun = (): FlowRunDTO => ({
    id: 'fr-1',
    short_id: 'fr1',
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
    flow_id: 'flow-1',
    flow_version_id: 'fv-1',
    status: 'completed',
    input: {},
    fail_on_error: true,
    output: { result: 'done' },
    node_tasks: {},
    node_outputs: {},
  });

  it('models optional node_statuses map keyed by graph node id', () => {
    const flowRun: FlowRunDTO = {
      ...baseFlowRun(),
      node_statuses: {
        'node-a': GraphNodeStatusRunning,
        'node-b': GraphNodeStatusCompleted,
        'node-c': GraphNodeStatusFailed,
      },
      node_outputs: {
        'node-b': { answer: 42 },
      },
    };

    const parsed = JSON.parse(JSON.stringify(flowRun)) as FlowRunDTO;

    expect(parsed.node_statuses?.['node-a']).toBe('running');
    expect(parsed.node_statuses?.['node-b']).toBe('completed');
    expect(parsed.node_statuses?.['node-c']).toBe('failed');
    expect(parsed.node_outputs['node-b']).toEqual({ answer: 42 });
  });

  it('allows FlowRunDTO without node_statuses for legacy responses', () => {
    const flowRun = baseFlowRun();

    expect(flowRun.node_statuses).toBeUndefined();
    expect(flowRun.node_outputs).toEqual({});
  });
});

describe('MeStatsResponse and StatBuckets (v0.7.97)', () => {
  it('models GET /me/stats aggregate counts with time-window buckets', () => {
    const extracted: StatBuckets = {
      today: 3,
      this_week: 12,
      all_time: 87,
    };
    const stats: MeStatsResponse = {
      knowledge_count: 15,
      skills_count: 4,
      extracted,
    };

    const parsed = JSON.parse(JSON.stringify(stats)) as MeStatsResponse;

    expect(parsed.knowledge_count).toBe(15);
    expect(parsed.skills_count).toBe(4);
    expect(parsed.extracted.today).toBe(3);
    expect(parsed.extracted.this_week).toBe(12);
    expect(parsed.extracted.all_time).toBe(87);
  });

  it('preserves zero-valued StatBuckets through JSON round-trip', () => {
    const buckets: StatBuckets = { today: 0, this_week: 0, all_time: 0 };

    const parsed = JSON.parse(JSON.stringify(buckets)) as StatBuckets;

    expect(parsed).toEqual({ today: 0, this_week: 0, all_time: 0 });
  });
});

describe('TelemetryReportDTO and SubmitTelemetryRequest (v0.7.97)', () => {
  it('models telemetry report DTO with level and arbitrary payload', () => {
    const report: TelemetryReportDTO = {
      id: 'tel-1',
      short_id: 't1',
      created_at: '2026-08-20T12:00:00Z',
      updated_at: '2026-08-20T12:00:00Z',
      ip: '203.0.113.10',
      level: 2,
      payload: {
        event: 'sdk_error',
        sdk_version: '1.2.3',
        message: 'stream reconnect failed',
      },
    };

    const parsed = JSON.parse(JSON.stringify(report)) as TelemetryReportDTO;

    expect(parsed.ip).toBe('203.0.113.10');
    expect(parsed.level).toBe(2);
    expect(parsed.payload.sdk_version).toBe('1.2.3');
  });

  it('models SubmitTelemetryRequest with client payload only', () => {
    const request: SubmitTelemetryRequest = {
      payload: {
        feature: 'agent_chat',
        duration_ms: 1523,
        success: true,
      },
    };

    const parsed = JSON.parse(JSON.stringify(request)) as SubmitTelemetryRequest;

    expect(parsed.payload.feature).toBe('agent_chat');
    expect(parsed.payload.duration_ms).toBe(1523);
    expect(parsed.payload.success).toBe(true);
  });
});

describe('nested merge strategy type contracts', () => {
  it('exports MergeStrategyNested for nested object delta fields', () => {
    expect(MergeStrategyNested).toBe('nested');
  });

  it('documents ToolCallDelta_fieldTags with replace and nested merge strategies', () => {
    expect(ToolCallDelta_fieldTags).toEqual({
      id: { merge: 'replace' },
      type: { merge: 'replace' },
      function: { merge: 'nested' },
    });
  });

  it('documents ToolCallFunctionDelta_fieldTags with replace name and concat arguments', () => {
    expect(ToolCallFunctionDelta_fieldTags).toEqual({
      name: { merge: 'replace' },
      arguments: { merge: 'concat' },
    });
  });

  it('aligns nested field tag merge values with MergeStrategy constants', () => {
    expect(ToolCallDelta_fieldTags.id.merge).toBe(MergeStrategyReplace);
    expect(ToolCallDelta_fieldTags.type.merge).toBe(MergeStrategyReplace);
    expect(ToolCallDelta_fieldTags.function.merge).toBe(MergeStrategyNested);
    expect(ToolCallFunctionDelta_fieldTags.name.merge).toBe(MergeStrategyReplace);
    expect(ToolCallFunctionDelta_fieldTags.arguments.merge).toBe(MergeStrategyConcat);
  });

  it('types nested field tag merge metadata as MergeStrategy values', () => {
    const strategies: MergeStrategy[] = [
      ToolCallDelta_fieldTags.id.merge,
      ToolCallDelta_fieldTags.type.merge,
      ToolCallDelta_fieldTags.function.merge,
      ToolCallFunctionDelta_fieldTags.name.merge,
      ToolCallFunctionDelta_fieldTags.arguments.merge,
    ];

    expect(strategies).toEqual([
      MergeStrategyReplace,
      MergeStrategyReplace,
      MergeStrategyNested,
      MergeStrategyReplace,
      MergeStrategyConcat,
    ]);
  });
});
