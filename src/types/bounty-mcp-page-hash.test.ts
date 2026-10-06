import * as main from '../index';
import {
  A2UIMcpApp,
  ErrorCodePaymentMethodRequired,
  type A2UIComponent,
  type BountyProgramDTO,
  type PaymentMethodRequiredMeta,
  type SubmitBountyRequest,
  type SubmitBountyResponse,
} from '../types';

/**
 * types regen 37077ba: BountyProgramDTO drops proof_min_length; A2UIComponent
 * adds mcpPageHash for deduplicated MCP App pages (GET /mcp-ui-pages/{hash}).
 */
describe('BountyProgramDTO without proof_min_length (37077ba)', () => {
  it('exports ErrorCodePaymentMethodRequired for bounty 402 responses', () => {
    expect(ErrorCodePaymentMethodRequired).toBe('payment_method_required');
    expect(main.ErrorCodePaymentMethodRequired).toBe('payment_method_required');
  });

  it('accepts BountyProgramDTO API payloads without proof_min_length', () => {
    const program: BountyProgramDTO = {
      id: 'bounty-1',
      namespace: 'platform',
      name: 'referral-bonus',
      description: 'Share your project link',
      amount_microcents: 5_000_000,
      grant_type: 'credit',
      expiry_days: 30,
      max_per_user: 1,
      max_per_day: 10,
      proof_type: 'url',
      requires_payment_method: true,
      status: 'active',
      notice_text: 'Add a card to claim rewards',
      notice_cooldown_hours: 24,
      notice_priority: 1,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(program.proof_type).toBe('url');
    expect(program.requires_payment_method).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(program, 'proof_min_length')).toBe(false);
  });

  it('accepts PaymentMethodRequiredMeta on bounty claim refusal', () => {
    const meta: PaymentMethodRequiredMeta = {
      bounty_id: 'bounty-1',
      billing_page: '/settings/billing',
    };
    expect(meta.billing_page).toContain('billing');
  });

  it('keeps SubmitBountyRequest proof_id contract for claims', () => {
    const body: SubmitBountyRequest = {
      bounty_id: 'bounty-1',
      proof_id: 'proof-abc',
      agent: 'claude-code',
      source: 'inference.sh/cli',
    };
    const response: SubmitBountyResponse = {
      submission: {
        id: 'sub-1',
        namespace: 'acme',
        bounty_id: 'bounty-1',
        proof_id: 'proof-abc',
        proof_ref: 'https://example.com/proof',
        created_at: '2026-01-02T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      },
      granted_amount: 5_000_000,
    };
    expect(response.submission.proof_id).toBe(body.proof_id);
  });
});

describe('A2UIComponent mcpPageHash for MCP Apps (37077ba)', () => {
  it('accepts hash-backed McpApp components without inline mcpHtml', () => {
    const component: A2UIComponent = {
      id: 'mcp-dedup',
      component: A2UIMcpApp,
      mcpPageHash: 'sha256:deadbeef',
      mcpServerSlug: 'notion',
      mcpCredentialId: 'cred-1',
      mcpToolName: 'search',
    };
    expect(component.mcpPageHash).toBe('sha256:deadbeef');
    expect(component.mcpHtml).toBeUndefined();
  });

  it('still accepts inline mcpHtml for artifact and legacy pages', () => {
    const component: A2UIComponent = {
      id: 'mcp-inline',
      component: A2UIMcpApp,
      mcpHtml: '<html><body>tool ui</body></html>',
      mcpArtifactId: 'art-ui',
    };
    expect(component.mcpHtml).toContain('tool ui');
    expect(component.mcpPageHash).toBeUndefined();
  });
});
