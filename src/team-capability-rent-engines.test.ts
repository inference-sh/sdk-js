import * as main from './index.js';
import {
  TeamCapabilityRentEngines,
  TeamKindOrg,
  type TeamCapability,
  type TeamViewDTO,
} from './types.js';

/**
 * models v0.8.199 / api-v1577: owners and admins may rent and extend cloud engines.
 */
describe('TeamCapability rent_engines (api-v1577)', () => {
  it('exports TeamCapabilityRentEngines from the main barrel', () => {
    expect(TeamCapabilityRentEngines).toBe('rent_engines');
    expect(main.TeamCapabilityRentEngines).toBe('rent_engines');
  });

  it('accepts rent_engines on TeamViewDTO.can for settings permission UI', () => {
    const view: TeamViewDTO = {
      team_id: 'team-1',
      kind: TeamKindOrg,
      governance: {
        billing: { by: 'owner', team_id: 'team-1' },
        policy: { by: 'owner', team_id: 'team-1' },
      },
      can: [TeamCapabilityRentEngines, 'manage_billing'],
    };

    const caps: TeamCapability[] = view.can;
    expect(caps).toEqual(['rent_engines', 'manage_billing']);
  });

  it('accepts rent_engines in needs_admin_access for staff capability renewal hints', () => {
    const view: TeamViewDTO = {
      team_id: 'team-1',
      kind: TeamKindOrg,
      governance: {
        billing: { by: 'owner', team_id: 'team-1' },
        policy: { by: 'owner', team_id: 'team-1' },
      },
      can: [],
      needs_admin_access: [TeamCapabilityRentEngines],
    };

    expect(view.needs_admin_access).toEqual(['rent_engines']);
  });
});