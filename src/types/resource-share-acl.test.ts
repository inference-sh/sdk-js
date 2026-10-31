import * as main from '../index.js';
import {
  ACLGranteeEveryone,
  ACLGranteeOrg,
  ACLGranteeTeam,
  ACLGranteeUser,
  PermRead,
  type ACLGrantee,
  type ResourceShareDTO,
  type ShareRequest,
} from '../types.js';

/**
 * Org-wide shares and ACL grantee typing landed in types regen 000d4f0 (INF-1133).
 */
describe('ACL grantee types (INF-1130 / 000d4f0)', () => {
  it('exports ACLGrantee constants from the main barrel', () => {
    expect(ACLGranteeUser).toBe('user');
    expect(ACLGranteeTeam).toBe('team');
    expect(ACLGranteeOrg).toBe('org');
    expect(ACLGranteeEveryone).toBe('everyone');
    expect(main.ACLGranteeUser).toBe('user');
    expect(main.ACLGranteeOrg).toBe('org');
    expect(main.ACLGranteeEveryone).toBe('everyone');
  });

  it('keeps ACLGrantee literals stable for share list filters', () => {
    const grantees: ACLGrantee[] = [
      ACLGranteeUser,
      ACLGranteeTeam,
      ACLGranteeOrg,
      ACLGranteeEveryone,
    ];
    expect(grantees).toEqual(['user', 'team', 'org', 'everyone']);
  });
});

describe('resource share DTOs (INF-1133 / 000d4f0)', () => {
  it('types ResourceShareDTO with grantee_type and org_id for org-wide shares', () => {
    const share: ResourceShareDTO = {
      id: 'share-1',
      short_id: 'shr1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      resource_id: 'art-1',
      resource_type: 'artifact',
      grantee_type: ACLGranteeOrg,
      grantee_id: 'org-1',
      user_id: '',
      org_id: 'org-1',
      permission: PermRead,
    };
    expect(share.grantee_type).toBe('org');
    expect(share.org_id).toBe('org-1');
  });

  it('types ShareRequest org and cross-team team_id grantees', () => {
    const orgShare: ShareRequest = { org: true, permission: PermRead };
    const teamShare: ShareRequest = { team_id: 'team-2', permission: PermRead };
    expect(orgShare.org).toBe(true);
    expect(teamShare.team_id).toBe('team-2');
  });
});
