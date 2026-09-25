import {
  APIError,
  AppCategoryOther,
  AppFunction,
  AppDTO,
  CreateAppRequest,
  AppPricing,
  AppStatusActive,
  AppStatusDeprecated,
  AppStatusMaintenance,
  AppStatusRetired,
  AddNodePayload,
  AppStoreListingDTO,
  AppVersionDTO,
  CheckRequirementsRequest,
  CheckRequirementsResponse,
  CredentialCompleteOAuthRequest,
  CredentialConnectRequest,
  CredentialRequirement,
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
  RequirementError,
  RequirementTypeCredential,
  SetupAction,
  SetupActionAddSecret,
  SetupActionConnect,
  SetupActionAddScopes,
  SecretCreateRequest,
  SuggestRequest,
  Widget,
  CacheScopePrivate,
  CacheScopePublic,
  DeviceTokenKindAPIKey,
  DeviceTokenKindSession,
  DeltaEvent,
  LLMDeltaEvent,
  EnforcementBlock,
  EntitlementDTO,
  EntitlementErrorMeta,
  EntitlementSourceAddon,
  EntitlementSourceTier,
  EntitlementTypeBoolean,
  EntitlementTypeLimit,
  EstimateCostRequest,
  EstimateCostResponse,
  KnowledgeCreateRequest,
  KnowledgeDTO,
  KnowledgeLifecycleDecay,
  KnowledgeLifecycleDeprecated,
  KnowledgeLifecycleDraft,
  KnowledgeLifecyclePermanent,
  KnowledgeTypeSkill,
  KnowledgeVersionDTO,
  KnowledgeUpdateRequest,
  KnowledgeVersionInput,
  FlowNodeData,
  FunctionKindRun,
  FunctionKindStream,
  InfraPrivate,
  SelectorConfig,
  UtilityConfig,
  UtilityPresetConstant,
  UtilityPresetGate,
  UtilityPresetMerge,
  UtilityPresetSelector,
  PlanDTO,
  PlanLimits,
  PlanTypeAddon,
  PlanTypeBase,
  PlanVersionDTO,
  MenuDTO,
  MenuItem,
  PageDTO,
  PageStatusPublished,
  PageTypeDoc,
  RefRouteDTO,
  RefRouteModeRedirect,
  RefRouteModeRewrite,
  RefRouteTypeApp,
  RefRouteTypeURL,
  ResourceFeatureSeedance,
  ResourceSeats,
  ResultMeta,
  RoleUser,
  ResultTypeComplete,
  ResultTypeInputRequired,
  ScopeAgentsRead,
  ScopeAppsRead,
  ScopeAppsWrite,
  ScopeGroupApps,
  ScopePreset,
  ScopesResponse,
  SkillDTO,
  SocketAccess,
  SocketDTO,
  SocketOutcomeClientClosed,
  SocketOutcomeDrained,
  SocketOutcomeNeverPaired,
  SocketOutcomeTaskEnded,
  SocketOutcomeWorkerClosed,
  SocketStatusClosed,
  SocketStatusOpen,
  SocketStatusPending,
  SubscriptionDTO,
  SubscriptionIntervalMonthly,
  SubscriptionStatusActive,
  TeamMemberDTO,
  TeamRoleAdmin,
  TeamRoleMember,
  TeamRoleOwner,
  TeamTypeOrg,
  ToolCallResponse,
  ToolContentTypeAudio,
  ToolContentTypeImage,
  ToolContentTypeResource,
  ToolContentTypeResourceLink,
  ToolContentTypeText,
  TaskResultDTO,
  TaskStatusCompleted,
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
  CredentialConfigDTO,
  CredentialDTO,
  CredentialGrantCredentials,
  CredentialGrantToken,
  CredentialScopeTeam,
  CredentialScopeUser,
  CredentialStatusConnected,
  CredentialTypeOAuth,
  MCPServerAuthNone,
  MCPServerDTO,
  AgentDTO,
  ChatDTO,
  ChatStatusIdle,
  ToolAuthTypeNone,
  ToolAuthConfig,
  AgentTool,
  ToolTypeHTTP,
  AgentRunDTO,
  AgentEvent,
  AgentEventApprovalRequired,
  AgentEventContentDelta,
  AgentEventRunStarted,
  AgentEventRunStateChanged,
  AgentEventToolCompleted,
  AgentRunStateCompleted,
  AgentRunStateWorking,
  ContentDeltaText,
  RunStartedPayload,
  RunStateChangedPayload,
  InternalToolsConfig,
  ChatData,
  ChannelContext,
  ChannelTypeSlack,
  ChannelTypeTeams,
  NotificationChannelEmail,
  NotificationDTO,
  NotificationPriorityNormal,
  NotificationStatusSent,
  NotificationTypeCreditNote,
  NotificationTypeInvoice,
  NotificationTypeSubscriptionCredit,
  SecretProviderRequest,
  SecretDTO,
  SecretUpdateRequest,
  FlowRunDTO,
  FlowRunStatusCompleted,
  GraphNodeStatusCompleted,
  GraphNodeStatusFailed,
  GraphNodeStatusRunning,
  MeStatsResponse,
  StatBuckets,
  SubmitTelemetryRequest,
  TelemetryReportDTO,
  LLMDelta,
  LLMOutput,
  LLMUsage,
  ToolCall,
  ToolCallDelta,
  ToolCallFunctionDelta,
  ToolTypeFunction,
  ChannelTypeDiscord,
  ChannelTypeTelegram,
  CreateAgentMessageRequest,
  CreateAgentRequest,
  FlowDTO,
  PublicAppStoreDTO,
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
    scope: 'team',
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
    title: 'Demo App',
    description: 'Demo app',
    agent_description: 'Runs demo tasks',
    category: AppCategoryOther,
    images: { card: '', thumbnail: '', banner: '' },
    version_id: 'ver-1',
    status: AppStatusActive,
    ...overrides,
  };
}

function makeAgent(overrides: Partial<AgentDTO> = {}): AgentDTO {
  return {
    id: 'agent-1',
    short_id: 'a1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: VisibilityPrivate,
    namespace: 'acme',
    name: 'harness-bot',
    title: 'Harness Bot',
    images: { card: '', thumbnail: '', banner: '' },
    version_id: 'ver-1',
    harness: '',
    ...overrides,
  };
}

function makeChat(overrides: Partial<ChatDTO> = {}): ChatDTO {
  return {
    id: 'chat-1',
    short_id: 'c1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: VisibilityPrivate,
    children: [],
    status: ChatStatusIdle,
    name: 'Session',
    description: '',
    chat_messages: [],
    agent_data: { plan_steps: [], memory: {}, always_allowed_tools: [] },
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

  it('exports RefRouteTypeURL for literal path site redirects', () => {
    expect(RefRouteTypeURL).toBe('url');
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

  it('requires title on AppDTO distinct from the immutable name slug', () => {
    const app = makeApp({
      name: 'veo-3-1',
      title: 'Veo 3.1',
    });

    expect(app.name).toBe('veo-3-1');
    expect(app.title).toBe('Veo 3.1');

    const parsed = JSON.parse(JSON.stringify(app)) as AppDTO;

    expect(parsed.title).toBe('Veo 3.1');
    expect(parsed.name).toBe('veo-3-1');
  });

  it('allows empty title on AppDTO for name fallback semantics', () => {
    const app = makeApp({ name: 'demo-app', title: '' });

    expect(app.title).toBe('');

    const parsed = JSON.parse(JSON.stringify(app)) as AppDTO;

    expect(parsed.title).toBe('');
  });

  it('accepts optional title on CreateAppRequest payloads', () => {
    const request: CreateAppRequest = {
      name: 'veo-3-1',
      title: 'Veo 3.1',
    };

    const parsed = JSON.parse(JSON.stringify(request)) as CreateAppRequest;

    expect(parsed.title).toBe('Veo 3.1');
  });

  it('requires title on AgentDTO distinct from the immutable name slug', () => {
    const agent = makeAgent({
      name: 'support-bot',
      title: 'Support Bot',
    });

    expect(agent.name).toBe('support-bot');
    expect(agent.title).toBe('Support Bot');

    const parsed = JSON.parse(JSON.stringify(agent)) as AgentDTO;

    expect(parsed.title).toBe('Support Bot');
    expect(parsed.name).toBe('support-bot');
  });

  it('allows empty title on AgentDTO for name fallback semantics', () => {
    const agent = makeAgent({ name: 'support-bot', title: '' });

    expect(agent.title).toBe('');

    const parsed = JSON.parse(JSON.stringify(agent)) as AgentDTO;

    expect(parsed.title).toBe('');
  });

  it('accepts optional title on CreateAgentRequest payloads', () => {
    const request: CreateAgentRequest = {
      name: 'support-bot',
      title: 'Support Bot',
    };

    const parsed = JSON.parse(JSON.stringify(request)) as CreateAgentRequest;

    expect(parsed.title).toBe('Support Bot');
    expect(parsed.name).toBe('support-bot');
  });

  it('preserves title on FlowDTO JSON round-trip separate from name slug', () => {
    const flow: FlowDTO = {
      id: 'flow-1',
      short_id: 'f1',
      created_at: '2026-07-25T00:00:00Z',
      updated_at: '2026-07-25T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      namespace: 'acme',
      name: 'onboarding',
      title: 'Customer Onboarding',
      description: 'Onboarding automation',
      card_image: '',
      thumbnail: '',
      banner_image: '',
      draft_version_id: 'draft-1',
      published_version_id: 'pub-1',
      input_schema: {},
      input: {},
      output_schema: {},
      output_mappings: {},
      node_data: {},
      nodes: [],
      edges: [],
    };

    const parsed = JSON.parse(JSON.stringify(flow)) as FlowDTO;

    expect(parsed.title).toBe('Customer Onboarding');
    expect(parsed.name).toBe('onboarding');
  });

  it('preserves title on PublicAppStoreDTO for store listings', () => {
    const listing: PublicAppStoreDTO = {
      id: 'app-store-1',
      category: 'video',
      namespace: 'acme',
      name: 'veo-3-1',
      title: 'Veo 3.1',
      description: 'Video generation',
      images: { card: '', thumbnail: '', banner: '' },
      is_featured: false,
      rank: 10,
      has_approved_version: true,
    };

    const parsed = JSON.parse(JSON.stringify(listing)) as PublicAppStoreDTO;

    expect(parsed.title).toBe('Veo 3.1');
    expect(parsed.name).toBe('veo-3-1');
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

  it('accepts RefRouteTypeURL routes with literal paths on alias_ref and target_ref', () => {
    const base = {
      id: 'route-url-1',
      short_id: 'rtu1',
      created_at: '2026-09-18T00:00:00Z',
      updated_at: '2026-09-18T00:00:00Z',
      type: RefRouteTypeURL,
      alias_ref: '/docs/api-files',
      target_ref: '/docs/api/sdk/files',
      primary: false,
      description: 'Docs alias',
      enabled: true,
    };

    const rewriteRoute: RefRouteDTO = { ...base, mode: RefRouteModeRewrite };
    const redirectRoute: RefRouteDTO = { ...base, mode: RefRouteModeRedirect };

    expect(rewriteRoute.type).toBe('url');
    expect(rewriteRoute.alias_ref).toBe('/docs/api-files');
    expect(rewriteRoute.target_ref).toBe('/docs/api/sdk/files');
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

describe('CredentialConnectRequest connection_scope (api 53509cc2)', () => {
  it('serializes connection_scope separately from OAuth permission scopes', () => {
    const request: CredentialConnectRequest = {
      provider: 'github',
      type: 'oauth',
      scopes: ['repo', 'read:org'],
      connection_scope: CredentialScopeTeam,
    };

    const parsed = JSON.parse(JSON.stringify(request)) as CredentialConnectRequest;

    expect(parsed.connection_scope).toBe(CredentialScopeTeam);
    expect(parsed.scopes).toEqual(['repo', 'read:org']);
  });

  it('allows connect without connection_scope so the provider default applies', () => {
    const request: CredentialConnectRequest = {
      provider: 'slack',
      type: 'oauth',
    };

    expect(request.connection_scope).toBeUndefined();
    expect(JSON.parse(JSON.stringify(request))).not.toHaveProperty('connection_scope');
  });
});

describe('CredentialCompleteOAuthRequest callback params (INF-786)', () => {
  it('models the standard OAuth code exchange without extra callback params', () => {
    const request: CredentialCompleteOAuthRequest = {
      provider: 'github',
      type: 'oauth',
      code: 'auth-code',
      state: 'csrf-state',
      code_verifier: 'pkce-verifier',
    };

    expect(request.params).toBeUndefined();
    expect(request.code_verifier).toBe('pkce-verifier');
  });

  it('forwards provider-specific callback query params for auth scheme {{callback.*}} lookups', () => {
    const request: CredentialCompleteOAuthRequest = {
      provider: 'quickbooks',
      type: 'oauth',
      code: 'qb-code',
      state: 'qb-state',
      params: {
        realmId: '4620816365003870360',
      },
    };

    expect(request.params?.realmId).toBe('4620816365003870360');
  });

  it('carries multiple callback params such as Shopify shop subdomain', () => {
    const request: CredentialCompleteOAuthRequest = {
      provider: 'shopify',
      type: 'oauth',
      code: 'shp-code',
      state: 'shp-state',
      params: {
        shop: 'acme-widgets.myshopify.com',
        timestamp: '1690000000',
      },
    };

    const parsed = JSON.parse(JSON.stringify(request)) as CredentialCompleteOAuthRequest;

    expect(parsed.params).toEqual({
      shop: 'acme-widgets.myshopify.com',
      timestamp: '1690000000',
    });
  });

  it('preserves code, state, and verifier alongside callback params through JSON round-trip', () => {
    const request: CredentialCompleteOAuthRequest = {
      provider: 'custom-saas',
      type: 'oauth',
      code: 'exchange-code',
      state: 'signed-state',
      code_verifier: 'verifier-xyz',
      params: { tenant: 'eu-west', org: 'org_abc' },
    };

    const parsed = JSON.parse(JSON.stringify(request)) as CredentialCompleteOAuthRequest;

    expect(parsed.provider).toBe('custom-saas');
    expect(parsed.code).toBe('exchange-code');
    expect(parsed.state).toBe('signed-state');
    expect(parsed.code_verifier).toBe('verifier-xyz');
    expect(parsed.params).toEqual({ tenant: 'eu-west', org: 'org_abc' });
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
      title: 'Product Docs',
      description: 'Product documentation',
      type: KnowledgeTypeSkill,
      lifecycle: KnowledgeLifecyclePermanent,
      version_id: 'ver-1',
      uses: 512,
      installs: 17,
    };

    expect(knowledge.uses).toBe(512);
    expect(knowledge.installs).toBe(17);
    expect(knowledge.title).toBe('Product Docs');
    expect(knowledge.name).toBe('docs');
  });

  it('preserves KnowledgeDTO title through JSON round-trip', () => {
    const knowledge: KnowledgeDTO = {
      id: 'know-1',
      short_id: 'k1',
      created_at: '2026-07-25T00:00:00Z',
      updated_at: '2026-07-25T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      namespace: 'acme',
      name: 'product-docs',
      title: 'Product Documentation',
      description: 'Product documentation',
      type: KnowledgeTypeSkill,
      lifecycle: KnowledgeLifecyclePermanent,
      version_id: 'ver-1',
      uses: 0,
      installs: 0,
    };

    const parsed = JSON.parse(JSON.stringify(knowledge)) as KnowledgeDTO;

    expect(parsed.title).toBe('Product Documentation');
    expect(parsed.name).toBe('product-docs');
  });

  it('accepts optional title on KnowledgeCreateRequest and KnowledgeUpdateRequest', () => {
    const createRequest: KnowledgeCreateRequest = {
      name: 'product-docs',
      title: 'Product Documentation',
    };
    const updateRequest: KnowledgeUpdateRequest = {
      title: 'Updated Product Docs',
    };

    const parsedCreate = JSON.parse(JSON.stringify(createRequest)) as KnowledgeCreateRequest;
    const parsedUpdate = JSON.parse(JSON.stringify(updateRequest)) as KnowledgeUpdateRequest;

    expect(parsedCreate.title).toBe('Product Documentation');
    expect(parsedUpdate.title).toBe('Updated Product Docs');
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
        totp_enabled: false,
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
  it('does not export removed A2UIHTML component type constant', async () => {
    const types = (await import('./types')) as Record<string, unknown>;
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
      title: 'WIP Notes',
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

  it('exports UtilityPreset constants for gate, selector, merge, and constant nodes', () => {
    expect(UtilityPresetGate).toBe('gate');
    expect(UtilityPresetSelector).toBe('selector');
    expect(UtilityPresetMerge).toBe('merge');
    expect(UtilityPresetConstant).toBe('constant');
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
      preset: UtilityPresetGate,
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

  it('models UtilityConfig random range fields for stochastic selector nodes', () => {
    const utility: UtilityConfig = {
      preset: UtilityPresetSelector,
      selector: {
        field: 'candidates',
        mode: 'index',
        index: 0,
      },
      random: true,
      random_min: 0.1,
      random_max: 0.9,
    };

    const parsed = JSON.parse(JSON.stringify(utility)) as UtilityConfig;

    expect(parsed.random).toBe(true);
    expect(parsed.random_min).toBe(0.1);
    expect(parsed.random_max).toBe(0.9);
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
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: 'private',
    flow_id: 'flow-1',
    flow_version_id: 'fv-1',
    status: FlowRunStatusCompleted,
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
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
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

describe('LLM output and streaming delta type contracts', () => {
  const sampleUsage = (): LLMUsage => ({
    stop_reason: 'end_turn',
    time_to_first_token: 0.12,
    tokens_per_second: 42.5,
    prompt_tokens: 100,
    completion_tokens: 25,
    total_tokens: 125,
    reasoning_tokens: 10,
    reasoning_time: 0.8,
  });

  it('models LLMOutput with response, reasoning, tool_calls, and usage', () => {
    const output: LLMOutput = {
      response: 'The weather is sunny.',
      reasoning: 'Checked forecast data.',
      tool_calls: [
        {
          id: 'call_abc',
          type: ToolTypeFunction,
          function: { name: 'search', arguments: { query: 'weather' } },
        },
      ],
      usage: sampleUsage(),
    };

    const parsed = JSON.parse(JSON.stringify(output)) as LLMOutput;

    expect(parsed.response).toBe('The weather is sunny.');
    expect(parsed.reasoning).toBe('Checked forecast data.');
    expect(parsed.tool_calls?.[0].function.arguments).toEqual({ query: 'weather' });
    expect(parsed.usage?.total_tokens).toBe(125);
  });

  it('models LLMDelta with required response and optional streaming fields', () => {
    const delta: LLMDelta = {
      response: 'Hel',
      reasoning: 'think',
      tool_calls: [
        {
          index: 0,
          id: 'call_1',
          type: ToolTypeFunction,
          function: { name: 'lookup', arguments: '{"q":' },
        },
      ],
      usage: sampleUsage(),
    };

    const parsed = JSON.parse(JSON.stringify(delta)) as LLMDelta;

    expect(parsed.response).toBe('Hel');
    expect(parsed.reasoning).toBe('think');
    expect(parsed.tool_calls?.[0].index).toBe(0);
    expect(parsed.tool_calls?.[0].function?.arguments).toBe('{"q":');
  });

  it('models ToolCallDelta index-based partial updates with argument fragments', () => {
    const first: ToolCallDelta = {
      index: 1,
      id: 'call_b',
      type: ToolTypeFunction,
      function: { name: 'run', arguments: '{"x":' },
    };
    const continuation: ToolCallDelta = {
      index: 1,
      function: { arguments: '42}' },
    };

    const parsedFirst = JSON.parse(JSON.stringify(first)) as ToolCallDelta;
    const parsedContinuation = JSON.parse(JSON.stringify(continuation)) as ToolCallDelta;

    expect(parsedFirst.index).toBe(1);
    expect(parsedFirst.id).toBe('call_b');
    expect(parsedFirst.function?.name).toBe('run');
    expect(parsedContinuation.index).toBe(1);
    expect(parsedContinuation.id).toBeUndefined();
    expect(parsedContinuation.function?.name).toBeUndefined();
    expect(parsedContinuation.function?.arguments).toBe('42}');
  });

  it('models ToolCallFunctionDelta as optional name and raw JSON argument fragments', () => {
    const fnDelta: ToolCallFunctionDelta = {
      name: 'search',
      arguments: '"partial"',
    };

    const parsed = JSON.parse(JSON.stringify(fnDelta)) as ToolCallFunctionDelta;

    expect(parsed.name).toBe('search');
    expect(parsed.arguments).toBe('"partial"');
  });

  it('models LLMDeltaEvent as the NDJSON wire envelope (v0.7.104)', () => {
    const event: LLMDeltaEvent = {
      delta: { response: 'lo' },
      seq: 7,
    };

    const parsed = JSON.parse(JSON.stringify(event)) as LLMDeltaEvent;

    expect(parsed.delta.response).toBe('lo');
    expect(parsed.seq).toBe(7);
  });

  it('round-trips a multi-index tool call delta sequence through LLMDeltaEvent envelopes', () => {
    const events: LLMDeltaEvent[] = [
      {
        seq: 1,
        delta: {
          response: '',
          tool_calls: [
            {
              index: 0,
              id: 'call_a',
              type: ToolTypeFunction,
              function: { name: 'first', arguments: '{}' },
            },
            {
              index: 1,
              id: 'call_b',
              type: ToolTypeFunction,
              function: { name: 'second', arguments: '{"n":' },
            },
          ],
        },
      },
      {
        seq: 2,
        delta: {
          response: 'done',
          tool_calls: [{ index: 1, function: { arguments: '1}' } }],
        },
      },
    ];

    const parsed = JSON.parse(JSON.stringify(events)) as LLMDeltaEvent[];

    expect(parsed[0].delta.tool_calls?.map((tc: ToolCallDelta) => tc.index)).toEqual([0, 1]);
    expect(parsed[1].delta.response).toBe('done');
    expect(parsed[1].delta.tool_calls?.[0].function?.arguments).toBe('1}');
  });

  it('distinguishes completed ToolCall arguments map from delta argument fragments', () => {
    const completed: ToolCall = {
      id: 'call_done',
      type: ToolTypeFunction,
      function: { name: 'fn', arguments: { ready: true } },
    };
    const fragment: ToolCallFunctionDelta = { arguments: '{"ready":' };

    expect(completed.function.arguments).toEqual({ ready: true });
    expect(fragment.arguments).toBe('{"ready":');
  });
});

function makePage(overrides: Partial<PageDTO> = {}): PageDTO {
  return {
    id: 'page-1',
    short_id: 'pg1',
    created_at: '2026-09-18T00:00:00Z',
    updated_at: '2026-09-18T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: VisibilityPrivate,
    is_featured: false,
    title: 'API Files',
    content: '# API Files',
    excerpt: 'How to upload files',
    status: PageStatusPublished,
    type: PageTypeDoc,
    metadata: {
      title: 'API Files',
      description: 'How to upload files',
      image: '',
      tags: ['docs'],
    },
    slug: 'api-files',
    path: '/docs/api-files',
    ...overrides,
  };
}

describe('site navigation types (page path, menu projection, url ref routes)', () => {
  it('requires path on PageDTO responses for site navigation', () => {
    const page = makePage();

    expect(page.path).toBe('/docs/api-files');
    expect(page.slug).toBe('api-files');
  });

  it('preserves PageDTO.path through JSON round-trip', () => {
    const page = makePage({ path: '/docs/api/sdk/files' });

    const parsed = JSON.parse(JSON.stringify(page)) as PageDTO;

    expect(parsed.path).toBe('/docs/api/sdk/files');
  });

  it('projects linked page path onto MenuItem when a menu is read', () => {
    const linkedItem: MenuItem = {
      id: 'item-1',
      label: 'API Files',
      page_id: 'page-1',
      path: '/docs/api-files',
      order: 0,
    };

    const externalItem: MenuItem = {
      id: 'item-2',
      label: 'GitHub',
      url: 'https://github.com/inference-sh',
      order: 1,
    };

    const menu: MenuDTO = {
      id: 'menu-1',
      short_id: 'mn1',
      created_at: '2026-09-18T00:00:00Z',
      updated_at: '2026-09-18T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      name: 'Docs',
      slug: 'docs',
      description: 'Documentation navigation',
      items: [linkedItem, externalItem],
    };

    const parsed = JSON.parse(JSON.stringify(menu)) as MenuDTO;

    expect(parsed.items[0].path).toBe('/docs/api-files');
    expect(parsed.items[0].page_id).toBe('page-1');
    expect(parsed.items[1].path).toBeUndefined();
    expect(parsed.items[1].url).toBe('https://github.com/inference-sh');
  });

  it('carries MenuItem.path on nested children for grouped nav trees', () => {
    const parent: MenuItem = {
      id: 'group-1',
      label: 'API',
      is_group: true,
      expanded: true,
      order: 0,
      children: [
        {
          id: 'item-1',
          label: 'Files',
          page_id: 'page-1',
          path: '/docs/api/sdk/files',
          order: 0,
        },
      ],
    };

    expect(parent.children?.[0].path).toBe('/docs/api/sdk/files');
  });
});

describe('ChannelContext and ChannelType (channel routing metadata)', () => {
  const minimalInput = {
    text: 'hello from slack',
    role: 'user' as const,
    context: [],
    system_prompt: '',
    context_size: 0,
  };

  it('exports ChannelType constants for messaging platform identifiers', () => {
    expect(ChannelTypeSlack).toBe('slack');
    expect(ChannelTypeDiscord).toBe('discord');
    expect(ChannelTypeTeams).toBe('teams');
    expect(ChannelTypeTelegram).toBe('telegram');
  });

  it('accepts ChannelContext with channel_type and reply routing metadata on CreateAgentMessageRequest', () => {
    const channelContext: ChannelContext = {
      channel_type: ChannelTypeSlack,
      channel_metadata: {
        channel_id: 'C123',
        thread_ts: '1234.5678',
      },
    };
    const request: CreateAgentMessageRequest = {
      input: minimalInput,
      channel_context: channelContext,
    };

    const parsed = JSON.parse(JSON.stringify(request)) as CreateAgentMessageRequest;

    expect(parsed.channel_context?.channel_type).toBe('slack');
    expect(parsed.channel_context?.channel_metadata).toEqual({
      channel_id: 'C123',
      thread_ts: '1234.5678',
    });
  });

  it('allows CreateAgentMessageRequest without channel_context for direct SDK runs', () => {
    const request: CreateAgentMessageRequest = {
      input: minimalInput,
    };

    expect(request.channel_context).toBeUndefined();
    expect(JSON.parse(JSON.stringify(request))).not.toHaveProperty('channel_context');
  });

  it('serializes channel_context with channel_type and channel_metadata wire keys', () => {
    const wire = JSON.stringify({
      input: minimalInput,
      channel_context: {
        channel_type: ChannelTypeTelegram,
        channel_metadata: { chat_id: 42, message_id: 99 },
      },
    });

    const parsed = JSON.parse(wire) as CreateAgentMessageRequest;

    expect(parsed.channel_context?.channel_type).toBe('telegram');
    expect(parsed.channel_context?.channel_metadata).toEqual({ chat_id: 42, message_id: 99 });
    expect(parsed).not.toHaveProperty('integration_context');
    expect(parsed.channel_context).not.toHaveProperty('integration_type');
    expect(parsed.channel_context).not.toHaveProperty('integration_metadata');
  });
});
describe('DeltaEvent (resource_id attribution)', () => {
  it('carries optional resource_id to name the message a delta belongs to', () => {
    const event: DeltaEvent = {
      delta: { response: 'Hel' },
      seq: 1,
      resource_id: 'msg-assistant-1',
    };

    const parsed = JSON.parse(JSON.stringify(event)) as DeltaEvent;

    expect(parsed.resource_id).toBe('msg-assistant-1');
    expect(parsed.delta).toEqual({ response: 'Hel' });
    expect(parsed.seq).toBe(1);
  });

  it('allows resource_id to be omitted on the wire envelope', () => {
    const event: DeltaEvent = {
      delta: { response: 'chunk' },
      seq: 42,
    };

    const parsed = JSON.parse(JSON.stringify(event)) as DeltaEvent;

    expect(parsed.resource_id).toBeUndefined();
    expect(parsed.delta).toEqual({ response: 'chunk' });
  });

  it('keeps LLMDeltaEvent as a backward-compatible alias', () => {
    const event: LLMDeltaEvent = {
      delta: { response: 'token' },
      seq: 7,
      resource_id: 'msg-1',
    };

    expect(event.resource_id).toBe('msg-1');
  });
});

describe('socket types (SocketDTO, SocketAccess, AppFunction.kind, TaskResultDTO.socket)', () => {
  function makeSocketAccess(overrides: Partial<SocketAccess> = {}): SocketAccess {
    return {
      id: 'sock-access-1',
      url: 'wss://relay.example.com/sockets/sock-1',
      token: 'access-token-abc',
      expires_at: '2026-09-21T12:00:00Z',
      ...overrides,
    };
  }

  function makeSocketDTO(overrides: Partial<SocketDTO> = {}): SocketDTO {
    return {
      id: 'sock-1',
      short_id: 's1',
      created_at: '2026-09-21T10:00:00Z',
      updated_at: '2026-09-21T10:05:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      task_id: 'task-1',
      relay: 'relay-us-east-1',
      status: SocketStatusOpen,
      client_frames: 0,
      client_bytes: 0,
      worker_frames: 0,
      worker_bytes: 0,
      ...overrides,
    };
  }

  function makeTaskResult(overrides: Partial<TaskResultDTO> = {}): TaskResultDTO {
    return {
      id: 'task-1',
      short_id: 't1',
      status: TaskStatusCompleted,
      status_text: 'completed',
      output: null,
      created_at: '2026-09-21T10:00:00Z',
      updated_at: '2026-09-21T10:05:00Z',
      ...overrides,
    };
  }

  it('exports FunctionKind constants for run and stream app functions', () => {
    expect(FunctionKindRun).toBe('run');
    expect(FunctionKindStream).toBe('stream');
  });

  it('exports SocketStatus constants for pending, open, and closed lifecycle states', () => {
    expect(SocketStatusPending).toBe('pending');
    expect(SocketStatusOpen).toBe('open');
    expect(SocketStatusClosed).toBe('closed');
  });

  it('exports SocketOutcome constants for all documented close reasons', () => {
    expect(SocketOutcomeClientClosed).toBe('client_closed');
    expect(SocketOutcomeWorkerClosed).toBe('worker_closed');
    expect(SocketOutcomeDrained).toBe('drained');
    expect(SocketOutcomeNeverPaired).toBe('never_paired');
    expect(SocketOutcomeTaskEnded).toBe('task_ended');
  });

  it('accepts AppFunction.kind stream for socket-parameter functions from engine discovery', () => {
    const fn: AppFunction = {
      name: 'interactive',
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
      kind: FunctionKindStream,
    };

    const parsed = JSON.parse(JSON.stringify(fn)) as AppFunction;

    expect(parsed.kind).toBe('stream');
    expect(parsed.name).toBe('interactive');
  });

  it('allows AppFunction without kind for legacy run functions (empty means run)', () => {
    const fn: AppFunction = {
      name: 'generate',
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
    };

    expect(fn.kind).toBeUndefined();
    expect(JSON.parse(JSON.stringify(fn))).not.toHaveProperty('kind');
  });

  it('preserves SocketAccess dial credentials through JSON round-trip', () => {
    const access = makeSocketAccess();

    const parsed = JSON.parse(JSON.stringify(access)) as SocketAccess;

    expect(parsed.id).toBe('sock-access-1');
    expect(parsed.url).toBe('wss://relay.example.com/sockets/sock-1');
    expect(parsed.token).toBe('access-token-abc');
    expect(parsed.expires_at).toBe('2026-09-21T12:00:00Z');
  });

  it('models SocketDTO with relay traffic counters and optional close metadata', () => {
    const socket = makeSocketDTO({
      status: SocketStatusClosed,
      paired_at: '2026-09-21T10:01:00Z',
      ended_at: '2026-09-21T10:04:30Z',
      outcome: SocketOutcomeClientClosed,
      close_code: 1000,
      close_reason: 'normal closure',
      client_frames: 42,
      client_bytes: 8192,
      worker_frames: 38,
      worker_bytes: 6144,
    });

    const parsed = JSON.parse(JSON.stringify(socket)) as SocketDTO;

    expect(parsed.status).toBe('closed');
    expect(parsed.outcome).toBe('client_closed');
    expect(parsed.close_code).toBe(1000);
    expect(parsed.close_reason).toBe('normal closure');
    expect(parsed.client_frames).toBe(42);
    expect(parsed.worker_bytes).toBe(6144);
  });

  it('accepts TaskResultDTO.socket for stream function run responses', () => {
    const access = makeSocketAccess();
    const result = makeTaskResult({ socket: access });

    const parsed = JSON.parse(JSON.stringify(result)) as TaskResultDTO;

    expect(parsed.socket?.id).toBe('sock-access-1');
    expect(parsed.socket?.url).toContain('wss://');
    expect(parsed.socket?.token).toBe('access-token-abc');
    expect(parsed.status).toBe(TaskStatusCompleted);
  });

  it('allows TaskResultDTO without socket for standard run functions', () => {
    const result = makeTaskResult({ output: { text: 'done' } });

    expect(result.socket).toBeUndefined();
    expect(JSON.parse(JSON.stringify(result))).not.toHaveProperty('socket');
  });
});

describe('secret provider types (SecretProviderRequest, provider fields, credential_id)', () => {
  function makeSecretDTO(overrides: Partial<SecretDTO> = {}): SecretDTO {
    return {
      id: 'sec-1',
      short_id: 's1',
      created_at: '2026-09-21T00:00:00Z',
      updated_at: '2026-09-21T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      key: 'API_TOKEN',
      masked_value: 'sk-****',
      ...overrides,
    };
  }

  it('models provider_name and provider_website on SecretCreateRequest for custom providers', () => {
    const request: SecretCreateRequest = {
      key: 'ACME_API_KEY',
      value: 'secret-value',
      provider: 'acme',
      provider_name: 'Acme Corp',
      provider_website: 'https://acme.example',
    };

    const parsed = JSON.parse(JSON.stringify(request)) as SecretCreateRequest;

    expect(parsed.provider).toBe('acme');
    expect(parsed.provider_name).toBe('Acme Corp');
    expect(parsed.provider_website).toBe('https://acme.example');
  });

  it('allows SecretCreateRequest without provider_name for platform-known providers', () => {
    const request: SecretCreateRequest = {
      key: 'GOOGLE_SA_JSON',
      value: '{"type":"service_account"}',
      provider: 'google',
    };

    expect(request.provider_name).toBeUndefined();
    expect(request.provider_website).toBeUndefined();
  });

  it('preserves SecretProviderRequest attach fields through JSON round-trip', () => {
    const request: SecretProviderRequest = {
      provider: 'github',
      connection_scope: CredentialScopeTeam,
      provider_name: 'GitHub Enterprise',
      provider_website: 'https://github.example.com',
    };

    const parsed = JSON.parse(JSON.stringify(request)) as SecretProviderRequest;

    expect(parsed.provider).toBe('github');
    expect(parsed.connection_scope).toBe('team');
    expect(parsed.provider_name).toBe('GitHub Enterprise');
    expect(parsed.provider_website).toBe('https://github.example.com');
  });

  it('allows SecretProviderRequest with empty provider to detach from a credential', () => {
    const detach: SecretProviderRequest = { provider: '' };

    expect(JSON.parse(JSON.stringify(detach))).toEqual({ provider: '' });
    expect(detach.connection_scope).toBeUndefined();
  });

  it('does not include provider fields on SecretUpdateRequest (immutable after creation)', () => {
    const update: SecretUpdateRequest = {
      value: 'rotated-secret',
      description: 'Rotated credentials',
    };

    expect(update).not.toHaveProperty('provider');
    expect(update).not.toHaveProperty('provider_name');
    expect(update).not.toHaveProperty('provider_website');
    expect(update).not.toHaveProperty('connection_scope');
  });

  it('models credential_id on SecretDTO when attached to a provider credential', () => {
    const secret = makeSecretDTO({ credential_id: 'cred-github-1' });

    const parsed = JSON.parse(JSON.stringify(secret)) as SecretDTO;

    expect(parsed.credential_id).toBe('cred-github-1');
    expect(parsed.key).toBe('API_TOKEN');
    expect(parsed.masked_value).toBe('sk-****');
  });

  it('allows SecretDTO without credential_id for plain secrets', () => {
    const secret = makeSecretDTO();

    expect(secret.credential_id).toBeUndefined();
    expect(JSON.parse(JSON.stringify(secret))).not.toHaveProperty('credential_id');
  });
});

describe('NotificationTypeCreditNote (e230eaae)', () => {
  function makeNotification(overrides: Partial<NotificationDTO> = {}): NotificationDTO {
    return {
      id: 'notif-1',
      short_id: 'n1',
      created_at: '2026-09-22T18:00:00Z',
      updated_at: '2026-09-22T18:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      type: NotificationTypeCreditNote,
      channel: NotificationChannelEmail,
      priority: NotificationPriorityNormal,
      status: NotificationStatusSent,
      subject: 'Credit note issued',
      retry_count: 0,
      ...overrides,
    };
  }

  it('exports NotificationTypeCreditNote for billing credit-note notifications', () => {
    expect(NotificationTypeCreditNote).toBe('credit_note');
  });

  it('distinguishes NotificationTypeCreditNote from adjacent billing types', () => {
    expect(NotificationTypeCreditNote).not.toBe(NotificationTypeInvoice);
    expect(NotificationTypeCreditNote).not.toBe(NotificationTypeSubscriptionCredit);
  });

  it('preserves NotificationDTO credit_note type and billing reference through JSON round-trip', () => {
    const notification = makeNotification({
      reference_type: 'credit_note',
      reference_id: 'cn-abc123',
      recipient_email: 'billing@example.com',
      body: 'A credit note has been applied to your account.',
      sent_at: '2026-09-22T18:01:00Z',
    });

    const parsed = JSON.parse(JSON.stringify(notification)) as NotificationDTO;

    expect(parsed.type).toBe('credit_note');
    expect(parsed.reference_type).toBe('credit_note');
    expect(parsed.reference_id).toBe('cn-abc123');
    expect(parsed.recipient_email).toBe('billing@example.com');
  });
});

describe('ChatDTO channel_context (channel origin on chat responses)', () => {
  const minimalChat = (): ChatDTO =>
    ({
      id: 'chat-1',
      short_id: 'c1',
      created_at: '2026-09-22T00:00:00Z',
      updated_at: '2026-09-22T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      status: ChatStatusIdle,
      children: [],
      name: 'Slack thread',
      description: '',
      chat_messages: [],
      agent_data: {} as ChatData,
    }) as ChatDTO;

  it('preserves channel_context with channel_type and reply routing metadata on ChatDTO', () => {
    const channelContext: ChannelContext = {
      channel_type: ChannelTypeSlack,
      channel_metadata: {
        channel_id: 'C123',
        thread_ts: '1234.5678',
      },
    };
    const chat: ChatDTO = {
      ...minimalChat(),
      channel_context: channelContext,
    };

    const parsed = JSON.parse(JSON.stringify(chat)) as ChatDTO;

    expect(parsed.channel_context?.channel_type).toBe('slack');
    expect(parsed.channel_context?.channel_metadata).toEqual({
      channel_id: 'C123',
      thread_ts: '1234.5678',
    });
  });

  it('allows ChatDTO without channel_context for SDK- or app-started chats', () => {
    const chat = minimalChat();

    expect(chat.channel_context).toBeUndefined();
    expect(JSON.parse(JSON.stringify(chat))).not.toHaveProperty('channel_context');
  });

  it('serializes ChatDTO channel_context with channel_type and channel_metadata wire keys', () => {
    const wire = JSON.stringify({
      ...minimalChat(),
      channel_context: {
        channel_type: ChannelTypeTeams,
        channel_metadata: { conversation_id: 'conv-9', service_url: 'https://teams.example' },
      },
    });

    const parsed = JSON.parse(wire) as ChatDTO;

    expect(parsed.channel_context?.channel_type).toBe('teams');
    expect(parsed.channel_context?.channel_metadata).toEqual({
      conversation_id: 'conv-9',
      service_url: 'https://teams.example',
    });
    expect(parsed).not.toHaveProperty('integration_context');
    expect(parsed.channel_context).not.toHaveProperty('integration_type');
    expect(parsed.channel_context).not.toHaveProperty('integration_metadata');
  });
});

describe('harness profile and remote binding (go/api 51d94e80)', () => {
  it('preserves AgentDTO profile_id and remote_id through JSON round-trip', () => {
    const agent = makeAgent({
      profile_id: 'prof-claude-code',
      remote_id: 'remote-macbook',
    });

    const parsed = JSON.parse(JSON.stringify(agent)) as AgentDTO;

    expect(parsed.profile_id).toBe('prof-claude-code');
    expect(parsed.remote_id).toBe('remote-macbook');
  });

  it('omits harness binding fields on AgentDTO when unset', () => {
    const parsed = JSON.parse(JSON.stringify(makeAgent())) as AgentDTO;

    expect(parsed.profile_id).toBeUndefined();
    expect(parsed.remote_id).toBeUndefined();
  });

  it('preserves AgentRunDTO profile_id and remote_id through JSON round-trip', () => {
    const run: AgentRunDTO = {
      id: 'run-1',
      short_id: 'r1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      agent_id: 'agent-1',
      chat_id: 'chat-1',
      state: AgentRunStateCompleted,
      profile_id: 'prof-remote-loop',
      remote_id: 'remote-linux-box',
    };

    const parsed = JSON.parse(JSON.stringify(run)) as AgentRunDTO;

    expect(parsed.profile_id).toBe('prof-remote-loop');
    expect(parsed.remote_id).toBe('remote-linux-box');
  });

  it('preserves ChatDTO harness_session_id and forked_from_message_id on wire', () => {
    const chat = makeChat({
      harness_session_id: 'claude-sess-abc',
      forked_from_message_id: 'msg-branch-point',
    });

    const parsed = JSON.parse(JSON.stringify(chat)) as ChatDTO;

    expect(parsed.harness_session_id).toBe('claude-sess-abc');
    expect(parsed.forked_from_message_id).toBe('msg-branch-point');
  });

  it('omits harness chat metadata when remote profile did not start the chat', () => {
    const parsed = JSON.parse(JSON.stringify(makeChat())) as ChatDTO;

    expect(parsed.harness_session_id).toBeUndefined();
    expect(parsed.forked_from_message_id).toBeUndefined();
  });
});

describe('InternalToolsConfig.remote (1ffd53a)', () => {
  it('round-trips remote flag on internal_tools config', () => {
    const config: InternalToolsConfig = {
      plan: true,
      remote: true,
    };

    const parsed = JSON.parse(JSON.stringify(config)) as InternalToolsConfig;

    expect(parsed.remote).toBe(true);
    expect(parsed.plan).toBe(true);
  });

  it('uses snake_case-free remote key on the wire object', () => {
    const serialized = JSON.stringify({ remote: true } satisfies InternalToolsConfig);

    expect(serialized).toBe('{"remote":true}');
    expect(serialized).not.toContain('remote_tools');
  });
});

describe('ToolAuthTypeNone (e3eabd9)', () => {
  it('exports the wire string for explicit no-auth HTTP tools', () => {
    expect(ToolAuthTypeNone).toBe('none');
  });

  it('round-trips ToolAuthConfig with type none on AgentTool.http', () => {
    const auth: ToolAuthConfig = { type: ToolAuthTypeNone };
    const tool: AgentTool = {
      name: 'public_fetch',
      description: 'Fetch public data',
      type: ToolTypeHTTP,
      http: { url: 'https://example.com/data', auth },
    };

    const parsed = JSON.parse(JSON.stringify(tool)) as AgentTool;

    expect(parsed.http?.auth).toEqual({ type: 'none' });
  });
});

describe('DeltaEvent.end (v0.8.2)', () => {
  it('models an end marker that names the completed resource without carrying delta payload', () => {
    const evt: DeltaEvent = {
      delta: null as never,
      seq: 42,
      end: 'run_abc123',
    };

    const parsed = JSON.parse(JSON.stringify(evt)) as DeltaEvent;

    expect(parsed.end).toBe('run_abc123');
    expect(parsed.seq).toBe(42);
    expect(parsed.delta).toBeNull();
    expect(parsed.resource_id).toBeUndefined();
  });

  it('allows end on the same envelope as a final delta for the named resource', () => {
    const evt: DeltaEvent = {
      delta: { response: 'done' },
      seq: 10,
      resource_id: 'msg-1',
      end: 'msg-1',
    };

    const parsed = JSON.parse(JSON.stringify(evt)) as DeltaEvent;

    expect(parsed.resource_id).toBe('msg-1');
    expect(parsed.end).toBe('msg-1');
    expect(parsed.delta).toEqual({ response: 'done' });
  });
});

describe('CredentialConfigDTO auth_scheme_id (v0.8.2)', () => {
  function makeCredentialConfig(
    overrides: Partial<CredentialConfigDTO> = {}
  ): CredentialConfigDTO {
    return {
      slug: 'my-oauth',
      provider: 'custom',
      type: 'oauth2',
      name: 'My OAuth',
      short_name: 'OAuth',
      description: 'Team-defined auth scheme',
      allows_byok: true,
      available: true,
      has_managed: false,
      connection_scope: 'team',
      ...overrides,
    };
  }

  it('round-trips auth_scheme_id for team-defined AuthScheme providers', () => {
    const config = makeCredentialConfig({ auth_scheme_id: 'asch_team_1' });

    const parsed = JSON.parse(JSON.stringify(config)) as CredentialConfigDTO;

    expect(parsed.auth_scheme_id).toBe('asch_team_1');
  });

  it('does not use the removed custom_provider_id wire key', () => {
    const config = makeCredentialConfig({ auth_scheme_id: 'asch_team_1' });
    const wire = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;

    expect(wire).not.toHaveProperty('custom_provider_id');
    expect(wire.auth_scheme_id).toBe('asch_team_1');
  });
});

function makeAgentDTO(overrides: Partial<AgentDTO> = {}): AgentDTO {
  return {
    id: 'agent-1',
    short_id: 'a1',
    created_at: '2026-09-24T00:00:00Z',
    updated_at: '2026-09-24T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: VisibilityPrivate,
    project_id: 'proj-1',
    namespace: 'inference',
    name: 'support-bot',
    title: 'Support Bot',
    images: { card: '', thumbnail: '', banner: '' },
    version_id: 'ver-1',
    harness: 'inference',
    ...overrides,
  };
}

function makeChatDTO(overrides: Partial<ChatDTO> = {}): ChatDTO {
  return {
    id: 'chat-1',
    short_id: 'c1',
    created_at: '2026-09-24T00:00:00Z',
    updated_at: '2026-09-24T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: VisibilityPrivate,
    children: [],
    status: ChatStatusIdle,
    name: 'Harness chat',
    description: '',
    chat_messages: [],
    agent_data: { plan_steps: [], memory: {}, always_allowed_tools: [] },
    ...overrides,
  };
}

describe('AgentDTO.harness and ChatDTO.work_dir (391d742)', () => {
  it('preserves harness on AgentDTO JSON round-trip for inference loop agents', () => {
    const agent = makeAgentDTO({ harness: 'inference' });

    const parsed = JSON.parse(JSON.stringify(agent)) as AgentDTO;

    expect(parsed.harness).toBe('inference');
  });

  it('preserves external agentprotocol harness ids on AgentDTO responses', () => {
    const agent = makeAgentDTO({
      harness: 'claude',
      profile_id: 'profile-7',
      remote_id: 'remote-mac',
    });

    const parsed = JSON.parse(JSON.stringify(agent)) as AgentDTO;

    expect(parsed.harness).toBe('claude');
    expect(parsed.profile_id).toBe('profile-7');
    expect(parsed.remote_id).toBe('remote-mac');
  });

  it('preserves work_dir on ChatDTO JSON round-trip for harness sessions', () => {
    const chat = makeChatDTO({
      harness_session_id: 'sess-resume-42',
      work_dir: '/Users/dev/myproject',
      forked_from_message_id: 'msg-branch',
    });

    const parsed = JSON.parse(JSON.stringify(chat)) as ChatDTO;

    expect(parsed.harness_session_id).toBe('sess-resume-42');
    expect(parsed.work_dir).toBe('/Users/dev/myproject');
    expect(parsed.forked_from_message_id).toBe('msg-branch');
  });

  it('allows ChatDTO without work_dir when harness uses default cwd', () => {
    const chat = makeChatDTO({ harness_session_id: 'sess-1' });

    const parsed = JSON.parse(JSON.stringify(chat)) as ChatDTO;

    expect(parsed.work_dir).toBeUndefined();
    expect(parsed.harness_session_id).toBe('sess-1');
  });

  it('preserves nested agent.harness on ChatDTO.agent responses', () => {
    const chat = makeChatDTO({
      agent: makeAgentDTO({ harness: 'codex', name: 'code-agent' }),
      work_dir: '/workspace/repo',
    });

    const parsed = JSON.parse(JSON.stringify(chat)) as ChatDTO;

    expect(parsed.agent?.harness).toBe('codex');
    expect(parsed.work_dir).toBe('/workspace/repo');
  });
});

describe('TeamMemberDTO permission hints (GET /teams/{id}/members)', () => {
  it('includes assignable_roles and removable when the caller may manage the member', () => {
    const member: TeamMemberDTO = {
      id: 'tm-1',
      user_id: 'user-2',
      team_id: 'team-1',
      role: TeamRoleMember,
      assignable_roles: [TeamRoleMember, TeamRoleAdmin],
      removable: true,
    };

    const parsed = JSON.parse(JSON.stringify(member)) as TeamMemberDTO;

    expect(parsed.assignable_roles).toEqual([TeamRoleMember, TeamRoleAdmin]);
    expect(parsed.removable).toBe(true);
  });

  it('allows absent assignable_roles and removable when the caller cannot act', () => {
    const member: TeamMemberDTO = {
      id: 'tm-2',
      user_id: 'user-owner',
      team_id: 'team-1',
      role: TeamRoleOwner,
    };

    expect(member.assignable_roles).toBeUndefined();
    expect(member.removable).toBeUndefined();
  });

  it('preserves removable false when role changes are not permitted', () => {
    const member: TeamMemberDTO = {
      id: 'tm-3',
      user_id: 'user-admin',
      team_id: 'team-1',
      role: TeamRoleAdmin,
      removable: false,
    };

    const parsed = JSON.parse(JSON.stringify(member)) as TeamMemberDTO;

    expect(parsed.removable).toBe(false);
    expect(parsed.assignable_roles).toBeUndefined();
  });
});

function makeCredentialRow(overrides: Partial<CredentialDTO> = {}): CredentialDTO {
  return {
    id: 'cred-1',
    short_id: 'cr1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: VisibilityPrivate,
    provider: 'github',
    type: CredentialTypeOAuth,
    grant: CredentialGrantToken,
    scope: CredentialScopeUser,
    status: CredentialStatusConnected,
    display_name: 'GitHub',
    scopes: ['repo'],
    is_primary: true,
    ...overrides,
  };
}

function makeCredentialConfig(overrides: Partial<CredentialConfigDTO> = {}): CredentialConfigDTO {
  return {
    slug: 'github',
    provider: 'github',
    type: 'oauth',
    name: 'GitHub',
    short_name: 'GitHub',
    description: 'Connect GitHub',
    allows_byok: false,
    available: true,
    has_managed: true,
    connection_scope: CredentialScopeTeam,
    ...overrides,
  };
}

describe('CredentialGrant and OAuth app vs connection rows (api 53509cc2)', () => {
  it('exports grant layer constants for OAuth app vs connection/token rows', () => {
    expect(CredentialGrantCredentials).toBe('credentials');
    expect(CredentialGrantToken).toBe('token');
  });

  it('models CredentialDTO connections with required grant and optional app_credential_id', () => {
    const row = makeCredentialRow({
      grant: CredentialGrantToken,
      app_credential_id: 'cred-app-github',
    });

    const parsed = JSON.parse(JSON.stringify(row)) as CredentialDTO;

    expect(parsed.grant).toBe('token');
    expect(parsed.app_credential_id).toBe('cred-app-github');
    expect(parsed).not.toHaveProperty('org_id');
  });

  it('models CredentialConfigDTO with connection_scope default and nested OAuth app row', () => {
    const appRow = makeCredentialRow({
      id: 'cred-app',
      grant: CredentialGrantCredentials,
      scope: CredentialScopeTeam,
      display_name: 'GitHub OAuth app',
      app_credential_id: undefined,
    });
    const config = makeCredentialConfig({
      connection_scope: CredentialScopeUser,
      app: appRow,
      credential: makeCredentialRow({
        id: 'cred-login',
        grant: CredentialGrantToken,
        app_credential_id: 'cred-app',
      }),
    });

    const parsed = JSON.parse(JSON.stringify(config)) as CredentialConfigDTO;

    expect(parsed.connection_scope).toBe('user');
    expect(parsed.app?.grant).toBe('credentials');
    expect(parsed.credential?.grant).toBe('token');
    expect(parsed.credential?.app_credential_id).toBe('cred-app');
    expect(parsed).not.toHaveProperty('grant');
  });
});

describe('PermissionModelDTO embed without org_id (api 53509cc2)', () => {
  it('models MCPServerDTO permission fields without org_id on the wire', () => {
    const server: MCPServerDTO = {
      id: 'mcp-1',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      slug: 'docs',
      name: 'docs',
      title: 'Docs MCP',
      description: 'Documentation server',
      icon_url: 'https://example.com/icon.png',
      server_url: 'https://mcp.example.com',
      auth_type: MCPServerAuthNone,
      default_scopes: [],
      documentation_url: 'https://example.com/docs',
    };

    const parsed = JSON.parse(JSON.stringify(server)) as MCPServerDTO;

    expect(parsed.team_id).toBe('team-1');
    expect(parsed).not.toHaveProperty('org_id');
  });

  it('preserves optional user and team relations on MCPServerDTO', () => {
    const server: MCPServerDTO = {
      id: 'mcp-1',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: VisibilityPrivate,
      slug: 'docs',
      name: 'docs',
      title: 'Docs MCP',
      description: 'Documentation server',
      icon_url: 'https://example.com/icon.png',
      server_url: 'https://mcp.example.com',
      auth_type: MCPServerAuthNone,
      default_scopes: [],
      documentation_url: 'https://example.com/docs',
      user: {
        id: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        role: RoleUser,
        avatar_url: '',
      },
      team: {
        id: 'team-1',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        type: TeamTypeOrg,
        username: 'acme',
        avatar_url: '',
        setup_completed: true,
      },
    };

    const parsed = JSON.parse(JSON.stringify(server)) as MCPServerDTO;

    expect(parsed.title).toBe('Docs MCP');
    expect(parsed.user?.id).toBe('user-1');
    expect(parsed.team?.username).toBe('acme');
  });
});

describe('AgentEvent backbone protocol (runs/chats event bus)', () => {
  it('keeps AgentEventType constants on stable wire values', () => {
    expect(AgentEventRunStarted).toBe('run.started');
    expect(AgentEventRunStateChanged).toBe('run.state_changed');
    expect(AgentEventContentDelta).toBe('content.delta');
    expect(AgentEventToolCompleted).toBe('tool.completed');
    expect(AgentEventApprovalRequired).toBe('approval.required');
  });

  it('round-trips AgentEvent envelopes with typed payloads', () => {
    const runStarted: AgentEvent = {
      id: 'evt-1',
      type: AgentEventRunStarted,
      run_id: 'run-1',
      chat_id: 'chat-1',
      agent_id: 'agent-1',
      timestamp: '2026-09-25T12:00:00Z',
      payload: {
        agent_id: 'agent-1',
        user_message_id: 'msg-1',
      } satisfies RunStartedPayload,
    };
    const stateChanged: AgentEvent = {
      id: 'evt-2',
      type: AgentEventRunStateChanged,
      run_id: 'run-1',
      chat_id: 'chat-1',
      timestamp: '2026-09-25T12:00:01Z',
      payload: {
        from_state: AgentRunStateWorking,
        to_state: AgentRunStateCompleted,
      } satisfies RunStateChangedPayload,
    };
    const contentDelta: AgentEvent = {
      id: 'evt-3',
      type: AgentEventContentDelta,
      run_id: 'run-1',
      chat_id: 'chat-1',
      timestamp: '2026-09-25T12:00:02Z',
      payload: { kind: ContentDeltaText, delta: 'hello' },
    };

    expect(JSON.parse(JSON.stringify(runStarted))).toEqual(runStarted);
    expect(JSON.parse(JSON.stringify(stateChanged))).toEqual(stateChanged);
    expect(JSON.parse(JSON.stringify(contentDelta))).toEqual(contentDelta);
  });
});

describe('CredentialRequirement and SetupAction (inf.yml + check-requirements)', () => {
  it('round-trips provider catalog fields and custom provider name/website on CredentialRequirement', () => {
    const catalog: CredentialRequirement = {
      provider: 'acme',
      name: 'Acme CRM',
      website: 'acme.com',
      secrets: ['ACME_API_KEY'],
    };
    const custom: CredentialRequirement = {
      name: 'Internal LDAP',
      website: 'ldap.internal.example',
      secrets: ['LDAP_BIND_DN', 'LDAP_BIND_PW'],
    };
    const capability: CredentialRequirement = {
      provider: 'google',
      key: 'google.sheets',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    };

    expect(JSON.parse(JSON.stringify(catalog))).toEqual(catalog);
    expect(JSON.parse(JSON.stringify(custom))).toEqual(custom);
    expect(JSON.parse(JSON.stringify(capability))).toEqual(capability);
  });

  it('models SetupAction add_secret with secrets and provider_website for unlisted providers', () => {
    const action: SetupAction = {
      type: SetupActionAddSecret,
      provider: 'acme',
      provider_name: 'Acme CRM',
      secrets: ['ACME_API_KEY'],
      provider_website: 'acme.com',
    };

    const parsed = JSON.parse(JSON.stringify(action)) as SetupAction;

    expect(parsed.type).toBe('add_secret');
    expect(parsed.secrets).toEqual(['ACME_API_KEY']);
    expect(parsed.provider_website).toBe('acme.com');
  });

  it('models CheckRequirementsRequest/Response with credential errors carrying SetupAction', () => {
    const request: CheckRequirementsRequest = {
      credentials: [
        {
          provider: 'acme',
          name: 'Acme CRM',
          website: 'acme.com',
          secrets: ['ACME_API_KEY'],
        },
      ],
    };
    const error: RequirementError = {
      type: RequirementTypeCredential,
      key: 'acme',
      message: 'Connect Acme CRM',
      action: {
        type: SetupActionAddSecret,
        provider: 'acme',
        provider_name: 'Acme CRM',
        secrets: ['ACME_API_KEY'],
        provider_website: 'acme.com',
      },
    };
    const response: CheckRequirementsResponse = { satisfied: false, errors: [error] };

    expect(JSON.parse(JSON.stringify(request))).toEqual(request);
    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
  });

  it('keeps SetupAction type constants on stable wire values', () => {
    expect(SetupActionAddSecret).toBe('add_secret');
    expect(SetupActionConnect).toBe('connect');
    expect(SetupActionAddScopes).toBe('add_scopes');
  });

  it('allows AppVersionDTO.required_credentials to carry inf.yml credential entries', () => {
    const version: AppVersionDTO = {
      id: 'ver-1',
      short_id: 'v1',
      created_at: '2026-09-24T00:00:00Z',
      updated_at: '2026-09-24T00:00:00Z',
      metadata: {},
      repository: 'github.com/acme/app',
      setup_schema: {},
      input_schema: {},
      output_schema: {},
      variants: {},
      env: {},
      kernel: 'python',
      resources: { gpu: { count: 0, vram: 0, type: "any" }, ram: 0 },
      required_credentials: [
        {
          provider: 'acme',
          name: 'Acme CRM',
          website: 'acme.com',
          secrets: ['ACME_API_KEY'],
        },
      ],
    };

    const parsed = JSON.parse(JSON.stringify(version)) as AppVersionDTO;

    expect(parsed.required_credentials?.[0]?.provider).toBe('acme');
    expect(parsed.required_credentials?.[0]?.website).toBe('acme.com');
  });
});
