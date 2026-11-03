import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EgressGrantAllowed,
  EgressGrantAsked,
  EgressGrantDeclined,
  EgressGrantEnded,
  EgressGrantOpen,
  EgressGrantReasonDeclined,
  EgressGrantReasonLoginDeleted,
  EgressGrantReasonLoginDisconnected,
  EgressGrantReasonNotOwner,
  EgressGrantReasonExpiredLifetime,
  EgressGrantReasonScopesMissing,
  EgressGrantReasonScopeEnded,
  EgressGrantReasonRevokedByOwner,
  EgressGrantScopeSandbox,
  EgressGrantScopeTask,
  EgressGrantSourceAgentConfig,
  EgressGrantSourceAppDeclared,
  EgressGrantSourceConnectedOffer,
  EgressGrantSourceOwnerApproval,
  EgressGrantSourceReconnect,
  EgressGrantSourceSandboxCreate,
  EngineCapabilityEgressGrants,
  ErrorCodeAccessRestricted,
  ErrorCodeWebAccessRestricted,
  SandboxCredentialAsk,
  type EgressGrantDTO,
  type EgressGrantReason,
  type EgressGrantScope,
  type EgressGrantSource,
  type EgressGrantState,
  type EngineCapability,
  type MeResponse,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/** types regen 5df186b: redlist access notice fields, access_restricted, egress grant DTOs (INF-1173). */
describe('egress grants and redlist access types (5df186b)', () => {
  it('exports EgressGrant scope constants on types and the main barrel', () => {
    const scopes: EgressGrantScope[] = [EgressGrantScopeTask, EgressGrantScopeSandbox];
    expect(scopes).toEqual(['task', 'sandbox']);
    expect(main.EgressGrantScopeTask).toBe('task');
    expect(main.EgressGrantScopeSandbox).toBe('sandbox');
  });

  it('exports EgressGrant state constants for grant lifecycle', () => {
    const states: EgressGrantState[] = [
      EgressGrantOpen,
      EgressGrantAsked,
      EgressGrantAllowed,
      EgressGrantDeclined,
      EgressGrantEnded,
    ];
    expect(states).toEqual(['open', 'asked', 'allowed', 'declined', 'ended']);
    expect(main.EgressGrantAsked).toBe('asked');
    expect(main.EgressGrantEnded).toBe('ended');
  });

  it('exports EgressGrant source constants for provenance', () => {
    const sources: EgressGrantSource[] = [
      EgressGrantSourceAppDeclared,
      EgressGrantSourceAgentConfig,
      EgressGrantSourceSandboxCreate,
      EgressGrantSourceOwnerApproval,
      EgressGrantSourceConnectedOffer,
      EgressGrantSourceReconnect,
    ];
    expect(sources).toHaveLength(6);
    expect(main.EgressGrantSourceOwnerApproval).toBe('owner_approval');
  });

  it('exports EgressGrant decline/end reason constants', () => {
    const reasons: EgressGrantReason[] = [
      EgressGrantReasonDeclined,
      EgressGrantReasonLoginDeleted,
      EgressGrantReasonLoginDisconnected,
      EgressGrantReasonNotOwner,
      EgressGrantReasonExpiredLifetime,
      EgressGrantReasonScopesMissing,
      EgressGrantReasonScopeEnded,
      EgressGrantReasonRevokedByOwner,
    ];
    expect(reasons).toHaveLength(8);
    expect(main.EgressGrantReasonRevokedByOwner).toBe('revoked_by_owner');
  });

  it('models EgressGrantDTO for sandbox/task grant list payloads', () => {
    expect(typesSource).toMatch(/GET \/sandboxes\/\{id\}\/grants, GET \/tasks\/\{id\}\/grants/);

    const grant: EgressGrantDTO = {
      id: 'g-1',
      scope: EgressGrantScopeSandbox,
      scope_id: 'sb-9',
      provider: 'github',
      mode: SandboxCredentialAsk,
      state: EgressGrantAllowed,
      source: EgressGrantSourceOwnerApproval,
      granted_by: 'user-1',
      credential_id: 'cred-1',
      host: 'api.github.com',
      created_at: '2026-11-03T12:00:00Z',
      updated_at: '2026-11-03T12:05:00Z',
    };
    expect(grant.mode).toBe('ask');
    expect(grant.state).toBe('allowed');
  });

  it('adds EngineCapabilityEgressGrants for grant-aware egress gateways', () => {
    expect(typesSource).toMatch(/\| "egress_grants"/);
    expect(typesSource).toMatch(
      /export const EngineCapabilityEgressGrants: EngineCapability = "egress_grants";/,
    );
    expect(typesSource).toMatch(/WsEgressRevokePayload/);

    const caps: EngineCapability[] = [EngineCapabilityEgressGrants];
    expect(caps).toEqual(['egress_grants']);
    expect(main.EngineCapabilityEgressGrants).toBe('egress_grants');
  });

  it('adds ErrorCodeAccessRestricted while keeping web_access_restricted for legacy clients', () => {
    expect(typesSource).toMatch(/\| "access_restricted"/);
    expect(typesSource).toMatch(
      /export const ErrorCodeAccessRestricted: ErrorCode = "access_restricted";/,
    );
    expect(typesSource).toMatch(/ErrorCodeWebAccessRestricted is no longer sent/);

    expect(ErrorCodeAccessRestricted).toBe('access_restricted');
    expect(ErrorCodeWebAccessRestricted).toBe('web_access_restricted');
    expect(main.ErrorCodeAccessRestricted).toBe('access_restricted');
    expect(main.ErrorCodeWebAccessRestricted).toBe('web_access_restricted');
  });

  it('extends MeResponse with redlist notice reference and contact', () => {
    expect(typesSource).toMatch(/notice_reference\?: string;/);
    expect(typesSource).toMatch(/notice_contact\?: string;/);
    expect(typesSource).toMatch(/redlist restricts this request/);

    const me: MeResponse = {
      needs_username: false,
      notice: 'Access limited',
      notice_reference: 'REF-42',
      notice_contact: 'support@example.com',
    };
    expect(me.notice_reference).toBe('REF-42');
    expect(me.notice_contact).toBe('support@example.com');
  });
});
