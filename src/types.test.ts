import {
  AppStoreListingDTO,
  EntitlementTypeBoolean,
  PlanLimits,
  RefRouteDTO,
  RefRouteModeRedirect,
  RefRouteModeRewrite,
  RefRouteTypeApp,
  ResourceFeatureSeedance,
} from './types';

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
