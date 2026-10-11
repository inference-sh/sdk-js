import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index';
import {
  AgentEventAccountUpdated,
  AgentEventContextUpdated,
  AgentEventLimitsUpdated,
  AgentEventSubagentCompleted,
  AgentEventSubagentStarted,
  AgentEventSubagentUpdated,
  AgentEventUsageUpdated,
  TurnUsageComplete,
  TurnUsagePartial,
  type AgentEventType,
  type AppFunction,
  type AppVersionDTO,
  type ContentDeltaPayload,
  type DeployWarning,
  type ScopesResponse,
  type ToolAnnotations,
  type TurnUsageStatus,
  type UsageUpdatedPayload,
} from '../types';

/**
 * Agent protocol v0.20+ (a6abeab) and app deploy types INF-1053 (bb1ace4, d4ba4ed)
 * landed on dev in the dd9d833 types regen batch.
 */
describe('agent protocol v0.20+ event types (a6abeab)', () => {
  it('exports new AgentEventType constants on the main barrel', () => {
    expect(main.AgentEventContextUpdated).toBe('context.updated');
    expect(main.AgentEventLimitsUpdated).toBe('limits.updated');
    expect(main.AgentEventAccountUpdated).toBe('account.updated');
    expect(main.AgentEventSubagentStarted).toBe('subagent.started');
    expect(main.AgentEventSubagentUpdated).toBe('subagent.updated');
    expect(main.AgentEventSubagentCompleted).toBe('subagent.completed');
    expect(AgentEventUsageUpdated).toBe('usage.updated');
  });

  it('keeps extended AgentEventType literals stable for SSE consumers', () => {
    const types: AgentEventType[] = [
      AgentEventContextUpdated,
      AgentEventLimitsUpdated,
      AgentEventAccountUpdated,
      AgentEventSubagentStarted,
      AgentEventSubagentUpdated,
      AgentEventSubagentCompleted,
    ];
    expect(types).toEqual([
      'context.updated',
      'limits.updated',
      'account.updated',
      'subagent.started',
      'subagent.updated',
      'subagent.completed',
    ]);
  });

  it('types UsageUpdatedPayload cache fields and TurnUsageStatus', () => {
    const usage: UsageUpdatedPayload = {
      prompt_tokens: 100,
      completion_tokens: 40,
      total_tokens: 140,
      cached_input_tokens: 60,
      cache_creation_tokens: 10,
      reasoning_tokens: 5,
      cost_usd: 0.012,
      status: TurnUsagePartial,
    };
    expect(usage.cached_input_tokens).toBe(60);
    expect(usage.status).toBe('partial');

    const statuses: TurnUsageStatus[] = [TurnUsageComplete, TurnUsagePartial];
    expect(statuses).toEqual(['complete', 'partial']);
  });

  it('types subagent_id on streaming and approval payloads', () => {
    const delta: ContentDeltaPayload = {
      kind: 'text',
      delta: 'hello',
      subagent_id: 'sub-1',
    };
    expect(delta.subagent_id).toBe('sub-1');
  });
});

describe('app function and deploy types INF-1053 (bb1ace4, d4ba4ed)', () => {
  it('types per-function credentials and MCP tool annotations on AppFunction', () => {
    const annotations: ToolAnnotations = {
      title: 'List rows',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    };
    const fn: AppFunction = {
      name: 'list_rows',
      credentials: [{ provider: 'acme', secrets: ['ACME_API_KEY'] }],
      annotations,
    };
    expect(fn.credentials?.[0].provider).toBe('acme');
    expect(fn.annotations?.readOnlyHint).toBe(true);
  });

  it('types DeployWarning on AppVersionDTO for deploy responses', () => {
    const warning: DeployWarning = {
      code: 'missing_annotations',
      function: 'list_rows',
      message: 'Add MCP annotations for read-only tools',
    };
    const version: AppVersionDTO = {
      id: 'av-1',
      short_id: 'av1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      metadata: {},
      repository: 'repo',
      setup_schema: {},
      input_schema: {},
      output_schema: {},
      env: {},
      kernel: 'linux',
      resources: {},
      warnings: [warning],
    };
    expect(version.warnings?.[0].code).toBe('missing_annotations');
  });

  it('types ScopesResponse.account_groups alongside account_scopes', () => {
    const body: ScopesResponse = {
      scopes: [],
      groups: [],
      presets: [],
      account_scopes: [
        { id: 'approvals:write', label: 'Approvals', description: '', scopes: ['approvals:write'] },
      ],
      account_groups: [
        {
          id: 'approvals',
          label: 'Approvals',
          description: 'Answer your own approval prompts',
        },
      ],
      login_preset: {
        id: 'login',
        label: 'CLI login',
        description: '',
        scopes: [],
        grants: [],
        default: true,
      },
    };
    expect(body.account_groups[0].id).toBe('approvals');
  });

  it('keeps generated agent and deploy shapes in types.ts (regen guard)', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toMatch(/account_groups: ScopeGroupDefinition\[\]/);
    expect(source).toMatch(/warnings\?: DeployWarning\[\]/);
    expect(source).toMatch(/export interface ToolAnnotations/);
    expect(source).toMatch(/subagent_id\?: string/);
    expect(source).toMatch(/cached_input_tokens\?: number/);
    expect(source).toMatch(/export const AgentEventSubagentStarted/);
  });
});
