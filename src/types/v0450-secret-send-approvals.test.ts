import * as main from '../index.js';
import {
  EgressGrantReasonRulesChanged,
  EngineCapabilityEgressHostAny,
  EngineCapabilityEgressHostSuffix,
  InterruptResourceSecretSend,
  InterruptResourceToolInvocation,
  InterruptResourceTurn,
  NotificationTypeApprovalRequest,
  NotificationTypeFormDigest,
  NotificationTypeFormSubmission,
  NotificationTypePaymentIncomplete,
  PolicyKindSecretSend,
  ScopeApprovalsRead,
  ScopeApprovalsWrite,
  type AlwaysAllowOptionsDTO,
  type AuthMethodKeyCheck,
  type CredentialMethodDTO,
  type InterruptResourceType,
  type Scope,
  type SecretCreateRequest,
  type SecretSendDTO,
  type SecretUpdateRequest,
} from '../types.js';

/**
 * go/models v0.8.215 / v0.45.0 (89cab56): INF-1404 secret-send interrupts,
 * deny_options, approvals:read, egress rules_changed / egress_host_any.
 */
describe('ScopeApprovalsRead (v0.45.0)', () => {
  it('exports approvals:read from types and the main barrel', () => {
    expect(ScopeApprovalsRead).toBe('approvals:read');
    expect(main.ScopeApprovalsRead).toBe('approvals:read');
  });

  it('keeps approvals read and write scopes distinct for API key policies', () => {
    const scopes: Scope[] = [ScopeApprovalsRead, ScopeApprovalsWrite];
    expect(scopes).toEqual(['approvals:read', 'approvals:write']);
  });
});

describe('InterruptResourceSecretSend (INF-1404)', () => {
  it('exports secret_send interrupt resource type from the main barrel', () => {
    expect(InterruptResourceSecretSend).toBe('secret_send');
    expect(main.InterruptResourceSecretSend).toBe('secret_send');
  });

  it('includes secret_send in InterruptResourceType literals', () => {
    const kinds: InterruptResourceType[] = [
      InterruptResourceTurn,
      InterruptResourceSecretSend,
      InterruptResourceToolInvocation,
    ];
    expect(kinds).toContain('secret_send');
  });
});

describe('SecretSendDTO and always-allow deny_options (INF-1404 / INF-1417)', () => {
  it('accepts task secret-send payloads with subject and declared_by_app', () => {
    const send: SecretSendDTO = {
      subject: 'sandbox:sbx-1',
      subject_name: 'my-sandbox',
      sandbox_id: 'sbx-1',
      host: 'api.acme.com',
      secret: 'OPENAI_API_KEY',
      secrets: ['OPENAI_API_KEY'],
      declared_by_app: true,
    };
    expect(send.declared_by_app).toBe(true);
  });

  it('accepts agent call secret-send payloads without required agent version fields', () => {
    const send: SecretSendDTO = {
      agent: 'alice/helper',
      agent_id: 'agt-1',
      host: 'alice.example',
      secrets: ['OPENAI_API_KEY'],
    };
    expect(send.agent_version_id).toBeUndefined();
  });

  it('allows deny_options on always-allow options for secret send interrupts', () => {
    const options: AlwaysAllowOptionsDTO = {
      options: [],
      deny_options: [
        {
          key: 'deny-host',
          label: 'Always deny this host',
          rules: [{ effect: 'deny', kind: PolicyKindSecretSend }],
        },
      ],
      secret_send: {
        host: 'api.acme.com',
        secrets: ['OPENAI_API_KEY'],
      },
    };
    expect(options.deny_options?.[0]?.key).toBe('deny-host');
    expect(options.secret_send?.host).toBe('api.acme.com');
  });
});

describe('egress grant and engine capability constants (v0.45.0)', () => {
  it('exports EgressGrantReasonRulesChanged for revoked secret grants', () => {
    expect(EgressGrantReasonRulesChanged).toBe('rules_changed');
    expect(main.EgressGrantReasonRulesChanged).toBe('rules_changed');
  });

  it('exports EngineCapabilityEgressHostAny distinct from host suffix', () => {
    expect(EngineCapabilityEgressHostAny).toBe('egress_host_any');
    expect(EngineCapabilityEgressHostSuffix).toBe('egress_host_suffix');
    expect(main.EngineCapabilityEgressHostAny).toBe('egress_host_any');
  });
});

describe('notification types (v0.45.0)', () => {
  it('exports approval and form notification literals from the main barrel', () => {
    expect(NotificationTypeApprovalRequest).toBe('approval_request');
    expect(NotificationTypeFormSubmission).toBe('form_submission');
    expect(NotificationTypeFormDigest).toBe('form_digest');
    expect(NotificationTypePaymentIncomplete).toBe('payment_incomplete');
    expect(main.NotificationTypeApprovalRequest).toBe('approval_request');
    expect(main.NotificationTypeFormSubmission).toBe('form_submission');
    expect(main.NotificationTypeFormDigest).toBe('form_digest');
    expect(main.NotificationTypePaymentIncomplete).toBe('payment_incomplete');
  });
});

describe('secret hosts and credential key-check shapes (v0.45.0)', () => {
  it('accepts hosts on SecretCreateRequest and SecretUpdateRequest', () => {
    const created: SecretCreateRequest = {
      key: 'OPENAI_API_KEY',
      value: 'sk-test',
      hosts: ['api.openai.com', '.openai.com'],
    };
    const updated: SecretUpdateRequest = {
      value: 'sk-rotated',
      hosts: ['api.openai.com'],
    };
    expect(created.hosts).toEqual(['api.openai.com', '.openai.com']);
    expect(updated.hosts).toEqual(['api.openai.com']);
  });

  it('accepts CredentialMethodDTO and AuthMethodKeyCheck for multi-method logins', () => {
    const method: CredentialMethodDTO = {
      type: 'api_key',
      instructions: 'Paste a bot token from Slack app settings.',
    };
    const keyCheck: AuthMethodKeyCheck = {
      url: 'https://slack.com/api/auth.test',
      method: 'POST',
      ok: '{{response.ok}}',
      name: '{{response.user}}',
    };
    expect(method.type).toBe('api_key');
    expect(keyCheck.ok).toContain('response.ok');
  });
});