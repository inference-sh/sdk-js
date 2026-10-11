import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as main from '../index.js';
import {
  ScopeGroupStore,
  ScopeStorePricing,
  ScopeStoreSubmit,
  type ApiAgentRunRequest,
  type ContextField,
  type MessageInput,
  type PaymentMethodRequiredMeta,
  type Scope,
  type ScopeGroup,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * models v0.8.91 types regen (6f8732c): MessageInput, ApiAgentRunRequest reshape,
 * ContextField.in_prompt, store scopes (admin:pricing split), PaymentMethodRequiredMeta.
 */
describe('MessageInput and ApiAgentRunRequest (models v0.8.91)', () => {
  it('exports MessageInput-shaped run bodies from the main barrel types', () => {
    const input: MessageInput = {
      text: 'hello',
      attachments: [{ uri: 'inf://files/a', filename: 'a.png', content_type: 'image/png' }],
      images: ['inf://files/legacy-img'],
      files: ['inf://files/legacy-doc'],
    };
    const body: ApiAgentRunRequest = {
      chat_id: 'chat-1',
      agent_id: 'agent-1',
      agent_version_id: 'ver-1',
      input,
      stream: true,
    };
    expect(body.input.text).toBe('hello');
    expect(body.input.attachments?.[0].uri).toBe('inf://files/a');
    expect(body.agent_version_id).toBe('ver-1');
  });

  it('types ContextField.in_prompt for caller-visible context in the system prompt', () => {
    const field: ContextField = {
      name: 'locale',
      description: 'User locale',
      required: true,
      in_prompt: true,
    };
    expect(field.in_prompt).toBe(true);
  });

  it('pins MessageInput and in_prompt in generated types.ts', () => {
    expect(typesSource).toMatch(/export interface MessageInput/);
    expect(typesSource).toMatch(/in_prompt\?: boolean/);
    expect(typesSource).toMatch(/input: MessageInput/);
    expect(typesSource).not.toMatch(/export interface CreateAgentMessageRequest/);
  });

  it('keeps channel_context on Agent.sendMessage run bodies (routing integrations)', () => {
    const agentsSource = readFileSync(join(__dirname, '..', 'api', 'agents.ts'), 'utf8');
    expect(agentsSource).toMatch(/channel_context: options\.channel_context/);
  });
});

describe('store scopes (models v0.8.91)', () => {
  it('exports store pricing and submit scopes on the main barrel', () => {
    expect(main.ScopeStorePricing).toBe('store:pricing');
    expect(main.ScopeStoreSubmit).toBe('store:submit');
    expect(ScopeStorePricing).toBe('store:pricing');
    expect(ScopeStoreSubmit).toBe('store:submit');
    expect(main.ScopeGroupStore).toBe('store');
    expect(ScopeGroupStore).toBe('store');
  });

  it('does not export the removed admin:pricing scope constant', () => {
    expect((main as Record<string, unknown>).ScopeAdminPricing).toBeUndefined();
    expect(typesSource).not.toMatch(/ScopeAdminPricing/);
    expect(typesSource).not.toMatch(/"admin:pricing"/);
  });

  it('keeps store scopes in the Scope union and ScopeGroup list', () => {
    const scopes: Scope[] = [ScopeStorePricing, ScopeStoreSubmit];
    expect(scopes).toEqual(['store:pricing', 'store:submit']);
    const groups: ScopeGroup[] = [ScopeGroupStore];
    expect(groups).toEqual(['store']);
  });

  it('drops ScopeDefinition.automation from generated types.ts', () => {
    expect(typesSource).not.toMatch(/automation\?: boolean/);
  });
});

describe('PaymentMethodRequiredMeta (models v0.8.91)', () => {
  it('allows billing-only meta without bounty_id', () => {
    const meta: PaymentMethodRequiredMeta = {
      billing_page: '/billing',
    };
    expect(meta.bounty_id).toBeUndefined();
    expect(meta.billing_page).toBe('/billing');
  });

  it('still types bounty_id when a bounty claim was refused', () => {
    const meta: PaymentMethodRequiredMeta = {
      bounty_id: 'bounty-1',
      billing_page: '/billing',
    };
    expect(meta.bounty_id).toBe('bounty-1');
  });
});
