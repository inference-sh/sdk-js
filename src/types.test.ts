import {
  AppStoreListingDTO,
  EnforcementBlock,
  EntitlementDTO,
  EntitlementSourceAddon,
  EntitlementSourceTier,
  EntitlementTypeLimit,
  ResourceFeatureSeedance,
  ResourceSeats,
} from './types';

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
