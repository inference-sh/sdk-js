import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ErrorCodeWebAccessRestricted,
  StepUpAdminSensitive,
  StepUpAdminSession,
  StepUpAPIKeyCreate,
  StepUpDelete,
  StepUpDeviceApprove,
  StepUpAdminElevationApprove,
  StepUpExport,
  StepUpFactorChange,
  StepUpFactorEnroll,
  StepUpOAuthApprove,
  StepUpSecretReveal,
  StepUpTeamMemberChange,
  StepUpTeamSSOChange,
  TeamMemberAddAdded,
  TeamMemberAddInvited,
  type FeatureAccess,
  type OAuthAuthorizeInfoResponse,
  type StepUpAction,
  type TeamMemberAddOutcome,
  type TeamMemberAddResultDTO,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/** types regen 55449c7: step-up actions, admin window, web access restriction, addMember outcomes. */
describe('step-up and admin security types (55449c7)', () => {
  const stepUpActions: StepUpAction[] = [
    StepUpExport,
    StepUpDelete,
    StepUpFactorEnroll,
    StepUpFactorChange,
    StepUpDeviceApprove,
    StepUpAdminElevationApprove,
    StepUpOAuthApprove,
    StepUpAPIKeyCreate,
    StepUpSecretReveal,
    StepUpAdminSession,
    StepUpAdminSensitive,
    StepUpTeamMemberChange,
    StepUpTeamSSOChange,
  ];

  it('exports every StepUpAction constant on types and the main barrel', () => {
    expect(stepUpActions).toHaveLength(13);
    expect(StepUpAdminSession).toBe('admin_session');
    expect(StepUpAdminSensitive).toBe('admin_sensitive');
    expect(StepUpOAuthApprove).toBe('oauth_approve');
    expect(StepUpTeamMemberChange).toBe('team_member_change');
    expect(main.StepUpAdminSession).toBe('admin_session');
    expect(main.StepUpOAuthApprove).toBe('oauth_approve');
  });

  it('documents admin_session as the ten-minute staff browser window', () => {
    expect(typesSource).toMatch(/StepUpAdminSession: open the staff browser session's ten-minute admin/);
    expect(typesSource).toMatch(/StepUpAdminSensitive: one sensitive admin action, every time, window/);
  });

  it('adds OAuthAuthorizeInfoResponse step-up fields for consent flows', () => {
    expect(typesSource).toMatch(/step_up_required: boolean;/);
    expect(typesSource).toMatch(/step_up_action\?: StepUpAction;/);
    expect(typesSource).toMatch(/step_up_target\?: string;/);

    const info: OAuthAuthorizeInfoResponse = {
      client_name: 'Example',
      client_type: 'public',
      origin: 'https://app.example',
      verified: true,
      scopes: ['conversations:read'],
      redirect_host: 'app.example',
      step_up_required: true,
      step_up_action: StepUpOAuthApprove,
      step_up_target: 'team-9|https://app.example/cb',
    };
    expect(info.step_up_required).toBe(true);
    expect(info.step_up_action).toBe('oauth_approve');
  });
});

describe('TeamMemberAddResultDTO (55449c7)', () => {
  it('exports added vs invited outcome constants from the main barrel', () => {
    const outcomes: TeamMemberAddOutcome[] = [TeamMemberAddAdded, TeamMemberAddInvited];
    expect(outcomes).toEqual(['added', 'invited']);
    expect(main.TeamMemberAddAdded).toBe('added');
    expect(main.TeamMemberAddInvited).toBe('invited');
  });

  it('models POST /teams/{id}/members discriminated responses', () => {
    const added: TeamMemberAddResultDTO = {
      outcome: TeamMemberAddAdded,
      member: { id: 'm-1', user_id: 'u-1', team_id: 't-1', role: 'member' },
    };
    const invited: TeamMemberAddResultDTO = {
      outcome: TeamMemberAddInvited,
      invite: { id: 'inv-1', email: 'new@example.com' },
    };
    expect(added.member?.user_id).toBe('u-1');
    expect(invited.invite?.email).toBe('new@example.com');
    expect(invited.member).toBeUndefined();
  });
});

describe('web access restriction and feature gate types (55449c7)', () => {
  it('exports ErrorCodeWebAccessRestricted for CLI-only network policy', () => {
    expect(ErrorCodeWebAccessRestricted).toBe('web_access_restricted');
    expect(main.ErrorCodeWebAccessRestricted).toBe('web_access_restricted');
    expect(typesSource).toMatch(/ErrorCodeWebAccessRestricted \(403\)/);
  });

  it('adds MeResponse.notice for restricted-address sign-in messaging', () => {
    expect(typesSource).toMatch(/notice\?: string;/);
    expect(typesSource).toMatch(/Notice is an operator's notice about the caller's access/);
  });

  it('adds FeatureAccess for CheckFeatureGate client UI', () => {
    expect(typesSource).toMatch(/export interface FeatureAccess \{/);
    const access: FeatureAccess = { resource: 'feature:sandboxes', allowed: true };
    expect(access.allowed).toBe(true);
  });
});
