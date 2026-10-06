import * as main from '../index';
import {
  A2UIMcpApp,
  ErrorCodeAlreadyEntitled,
  ErrorCodeAlreadySubmitted,
  ErrorCodeFormClosed,
  ErrorCodeRequestOpen,
  EntitlementRequestAccepted,
  EntitlementRequestDeclined,
  EntitlementRequestOpen,
  EntitlementRequestWithdrawn,
  FormStatusClosed,
  FormStatusDraft,
  FormStatusOpen,
  FormSubmitMany,
  FormSubmitOncePerTeam,
  FormSubmitOncePerUser,
  NotificationTypeEntitlementRequest,
  type A2UIComponent,
  type AppVersionDTO,
  type CreateEntitlementRequestRequest,
  type EntitlementErrorMeta,
  type EntitlementRequestDTO,
  type EntitlementRequestState,
  type FormDTO,
  type FormStatus,
  type FormSubmitPolicy,
  type MCPUICSP,
  type ResourceContent,
  type SubmitFormRequest,
} from '../types';

/**
 * Forms, entitlement requests, MCP Apps (SEP-1865), and AppVersionDTO.ui landed in
 * types regen 8c22b7f / 436a4fb (go/api forms + MCP Apps merge).
 */
describe('forms API types (436a4fb)', () => {
  it('exports FormStatus and FormSubmitPolicy constants from the main barrel', () => {
    expect(main.FormStatusDraft).toBe('draft');
    expect(main.FormStatusOpen).toBe('open');
    expect(main.FormStatusClosed).toBe('closed');
    expect(main.FormSubmitOncePerUser).toBe('once_per_user');
    expect(main.FormSubmitOncePerTeam).toBe('once_per_team');
    expect(main.FormSubmitMany).toBe('many');
  });

  it('keeps form lifecycle and submit-policy literals stable for API payloads', () => {
    const statuses: FormStatus[] = [FormStatusDraft, FormStatusOpen, FormStatusClosed];
    expect(statuses).toEqual(['draft', 'open', 'closed']);

    const policies: FormSubmitPolicy[] = [
      FormSubmitOncePerUser,
      FormSubmitOncePerTeam,
      FormSubmitMany,
    ];
    expect(policies).toEqual(['once_per_user', 'once_per_team', 'many']);
  });

  it('accepts FormDTO with schema and submit_policy for gated submissions', () => {
    const form: FormDTO = {
      id: 'form-1',
      namespace: 'acme',
      name: 'beta-access',
      title: 'Beta access',
      description: 'Request early access',
      schema: { type: 'object', properties: { reason: { type: 'string' } } },
      status: FormStatusOpen,
      submit_policy: FormSubmitOncePerTeam,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(form.submit_policy).toBe(FormSubmitOncePerTeam);
  });

  it('accepts SubmitFormRequest provenance fields used for rewards and auditing', () => {
    const body: SubmitFormRequest = {
      data: { reason: 'load testing' },
      source: 'api',
      agent: 'claude-code',
      context: 'inference.sh/cli',
    };
    expect(body.source).toBe('api');
  });

  it('exports form conflict ErrorCode constants for closed forms and duplicate submits', () => {
    expect(ErrorCodeFormClosed).toBe('form_closed');
    expect(ErrorCodeAlreadySubmitted).toBe('already_submitted');
    expect(main.ErrorCodeFormClosed).toBe('form_closed');
    expect(main.ErrorCodeAlreadySubmitted).toBe('already_submitted');
  });
});

describe('entitlement request types (436a4fb)', () => {
  it('exports EntitlementRequestState constants from the main barrel', () => {
    expect(main.EntitlementRequestOpen).toBe('open');
    expect(main.EntitlementRequestAccepted).toBe('accepted');
    expect(main.EntitlementRequestDeclined).toBe('declined');
    expect(main.EntitlementRequestWithdrawn).toBe('withdrawn');
  });

  it('keeps entitlement request state literals stable for admin queue filters', () => {
    const states: EntitlementRequestState[] = [
      EntitlementRequestOpen,
      EntitlementRequestAccepted,
      EntitlementRequestDeclined,
      EntitlementRequestWithdrawn,
    ];
    expect(states).toEqual(['open', 'accepted', 'declined', 'withdrawn']);
  });

  it('accepts CreateEntitlementRequestRequest with optional form slug and answers', () => {
    const body: CreateEntitlementRequestRequest = {
      resource: 'feature:marketplace_publish',
      requested: { type: 'boolean', enabled: true },
      form: 'acme/beta-access',
      data: { reason: 'launch week' },
    };
    expect(body.form).toContain('/');
  });

  it('accepts EntitlementRequestDTO linking a form submission for admin review', () => {
    const request: EntitlementRequestDTO = {
      id: 'req-1',
      resource: 'feature:marketplace_publish',
      requested: { type: 'boolean', enabled: true },
      submission_id: 'sub-9',
      submission: {
        id: 'sub-9',
        form_id: 'form-1',
        form_team_id: 'team-owner',
        submitter_team_id: 'team-requester',
        data: { reason: 'launch week' },
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      },
      state: EntitlementRequestOpen,
      created_at: '2026-01-02T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    };
    expect(request.submission?.form_id).toBe('form-1');
  });

  it('extends EntitlementErrorMeta with requestable and request_state for upsell UX', () => {
    const meta: EntitlementErrorMeta = {
      resource: 'feature:forms',
      upgrade_available: true,
      requestable: true,
      request_state: EntitlementRequestOpen,
    };
    expect(meta.requestable).toBe(true);
    expect(meta.request_state).toBe('open');
  });

  it('exports entitlement request conflict ErrorCode constants', () => {
    expect(ErrorCodeAlreadyEntitled).toBe('already_entitled');
    expect(ErrorCodeRequestOpen).toBe('request_open');
    expect(main.ErrorCodeAlreadyEntitled).toBe('already_entitled');
    expect(main.ErrorCodeRequestOpen).toBe('request_open');
  });

  it('exports NotificationTypeEntitlementRequest for admin decision alerts', () => {
    expect(NotificationTypeEntitlementRequest).toBe('entitlement_request');
    expect(main.NotificationTypeEntitlementRequest).toBe('entitlement_request');
  });
});

describe('MCP Apps and AppVersionDTO.ui (8c22b7f / 436a4fb)', () => {
  it('exports A2UIMcpApp component type for SEP-1865 embeds', () => {
    expect(A2UIMcpApp).toBe('McpApp');
    expect(main.A2UIMcpApp).toBe('McpApp');
  });

  it('accepts A2UIComponent McpApp fields for sandboxed tool pages', () => {
    const csp: MCPUICSP = {
      connectDomains: ['https://api.example.com'],
      frameDomains: ['https://cdn.example.com'],
    };
    const component: A2UIComponent = {
      id: 'mcp-1',
      component: A2UIMcpApp,
      mcpHtml: '<html></html>',
      mcpCsp: csp,
      mcpServerSlug: 'notion',
      mcpCredentialId: 'cred-1',
      mcpToolName: 'search',
      mcpToolInput: { q: 'docs' },
      mcpToolResult: {
        content: [{ type: 'text', text: 'ok' }],
        isError: false,
        _meta: { ui: { csp } },
      },
      mcpArtifactId: 'art-ui',
    };
    expect(component.component).toBe('McpApp');
    expect(component.mcpToolResult?.content).toHaveLength(1);
  });

  it('accepts ResourceContent._meta for MCP resource UI metadata', () => {
    const block: ResourceContent = {
      uri: 'ui://tool/page',
      name: 'page',
      _meta: { ui: { csp: { connectDomains: ['https://host'] } } },
    };
    expect(block._meta?.ui).toBeDefined();
  });

  it('accepts AppVersionDTO.ui artifact ref beside metadata map', () => {
    const version: AppVersionDTO = {
      id: 'ver-1',
      metadata: { ui: { artifact: 'acme/dashboard' } },
      ui: { artifact: 'acme/dashboard' },
      repository: 'github.com/acme/app',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(version.ui?.artifact).toBe('acme/dashboard');
  });
});
