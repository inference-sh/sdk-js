import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';
import type {
  AgentRunDTO,
  AuthMethod,
  ChatRunEvent,
  CursorListRequest,
  CursorListResponse,
  ToolInvocationDTO,
} from './types.js';
import {
  AgentRunStateCompleted,
  AgentRunStateWorking,
  AuthMethodOAuth2,
  RunEndReasonNoReply,
  ToolInvocationStatusInProgress,
  ToolTypeFunction,
} from './types.js';

const root = join(__dirname, '..');

function interfaceBlock(typesSource: string, name: string): string {
  const start = typesSource.indexOf(`export interface ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const slice = typesSource.slice(start);
  const end = slice.indexOf('\nexport ');
  return end === -1 ? slice : slice.slice(0, end);
}

/**
 * Release c15d87e / changelog 0.34.0: cursor-only list pagination, tool call
 * action phrases, run finished_at, run_ended duration_ms, and provider-native
 * OAuth scope naming (730b597–51877b5 on dev).
 */
describe('release v0.34.0 (c15d87e)', () => {
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const mcpSource = readFileSync(join(__dirname, 'agent/mcp-input.ts'), 'utf8');
  const agentsApiSource = readFileSync(join(__dirname, 'api/agents.ts'), 'utf8');

  it('ships version 0.34.0 with an empty Unreleased section and a dated 0.34.0 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.34.0');
    expect(SDK_VERSION).toBe('0.34.0');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.34\.0\] - 2026-10-26/);
    expect(changelog).toMatch(/`CursorListRequest\.page` and `CursorListResponse\.total_items` are gone/);
    expect(changelog).toMatch(/`ToolInvocationDTO\.action`/);
    expect(changelog).toMatch(/`AgentRunDTO\.finished_at`/);
    expect(changelog).toMatch(/`ChatRunEvent\.duration_ms`/);
    expect(changelog).toMatch(/`scope_aliases` are optional shorthand/);
    expect(changelog).toMatch(/## \[0\.33\.0\] - 2026-10-24/);
  });

  it('types cursor-only list requests and responses (breaking pagination shape)', () => {
    const request: CursorListRequest = {
      cursor: '',
      limit: 20,
      direction: 'next',
      filters: [],
      preloads: [],
      sort: [],
      fields: [],
      permissions: [],
      include_others: false,
    };
    expect(request).not.toHaveProperty('page');

    const response: CursorListResponse<{ id: string }> = {
      items: [{ id: 'a' }],
      next_cursor: 'n',
      prev_cursor: 'p',
      has_next: false,
      has_previous: false,
      items_per_page: 20,
    };
    expect(response).not.toHaveProperty('total_items');

    const reqBlock = interfaceBlock(typesSource, 'CursorListRequest');
    const resBlock = interfaceBlock(typesSource, 'CursorListResponse');
    expect(reqBlock).not.toMatch(/\bpage\?:/);
    expect(resBlock).not.toMatch(/\btotal_items\b/);
    expect(typesSource).toMatch(/export interface CountResponse[\s\S]*count: number/);
  });

  it('types optional tool call action phrases separate from display_name', () => {
    const invocation: ToolInvocationDTO = {
      id: 'ti-1',
      short_id: 'ti-1',
      created_at: '2026-10-26T10:00:00Z',
      updated_at: '2026-10-26T10:00:00Z',
      user_id: 'u',
      team_id: 't',
      visibility: 'private',
      chat_message_id: 'm',
      tool_invocation_id: 'ti-1',
      type: ToolTypeFunction,
      display_name: 'Mail search',
      action: 'Fetch unread emails from alice@x.com',
      function: { name: 'search', arguments: {} },
      status: ToolInvocationStatusInProgress,
    };
    expect(invocation.action).toContain('alice@x.com');

    const block = interfaceBlock(typesSource, 'ToolInvocationDTO');
    expect(block).toMatch(/imperative phrase/);
    expect(block).toMatch(/\baction\?: string/);
    expect(block).not.toMatch(/\baction: string/);
  });

  it('types optional finished_at on terminal runs only', () => {
    const done: AgentRunDTO = {
      id: 'run-1',
      short_id: 'run-1',
      created_at: '2026-10-26T10:00:00Z',
      updated_at: '2026-10-26T10:05:00Z',
      agent_id: 'agent-1',
      chat_id: 'chat-1',
      state: AgentRunStateCompleted,
      finished_at: '2026-10-26T10:04:59Z',
    };
    expect(done.finished_at).toMatch(/T10:04:59Z/);

    const working: AgentRunDTO = {
      id: 'run-2',
      short_id: 'run-2',
      created_at: '2026-10-26T10:00:00Z',
      updated_at: '2026-10-26T10:01:00Z',
      agent_id: 'agent-1',
      chat_id: 'chat-1',
      state: AgentRunStateWorking,
    };
    expect(working).not.toHaveProperty('finished_at');

    const block = interfaceBlock(typesSource, 'AgentRunDTO');
    expect(block).toMatch(/FinishedAt is when the run reached a terminal state/);
    expect(block).toContain('finished_at?: string /* RFC3339 */');
  });

  it('types optional run duration on run_ended events', () => {
    const ended: ChatRunEvent = {
      run_id: 'run-9',
      state: AgentRunStateCompleted,
      reason: RunEndReasonNoReply,
      duration_ms: 4321,
    };
    expect(ended.duration_ms).toBe(4321);

    const legacy: ChatRunEvent = {
      run_id: 'run-old',
      state: AgentRunStateCompleted,
    };
    expect(legacy).not.toHaveProperty('duration_ms');

    const block = interfaceBlock(typesSource, 'ChatRunEvent');
    expect(block).toMatch(/DurationMs is how long the run took/);
    expect(block).toMatch(/duration_ms\?: number/);
  });

  it('documents provider-native OAuth scopes with optional scope_aliases shorthand', () => {
    const auth: AuthMethod = {
      kind: AuthMethodOAuth2,
      scopes: ['channels:read'],
      scope_aliases: { slack_read: 'channels:read' },
    };
    expect(auth.scopes?.[0]).toBe('channels:read');

    expect(typesSource).toMatch(
      /Scopes are the provider's[\s\S]*own names \(Wire form\), the ones a credential stores/,
    );
    expect(typesSource).toMatch(/ScopeAliases are shorthand a caller may write for a provider scope/);
    expect(typesSource).not.toMatch(/Scopes are in the scheme's own \(friendly\) names/);
    expect(typesSource).not.toMatch(/Credentials store the alias; the wire form is used only/);
  });

  it('keeps MCP elicit response.action separate from ToolInvocationDTO.action', () => {
    expect(mcpSource).toMatch(/response\.action === 'accept'/);
    expect(mcpSource).not.toMatch(/invocation\.action/);
  });

  it('lists agents with CursorListRequest on API clients', () => {
    expect(agentsApiSource).toMatch(
      /async list\(params\?: Partial<CursorListRequest>\): Promise<Response<CursorListResponse<AgentDTO>>>/,
    );
    expect(agentsApiSource).toMatch(/cursor-based pagination/);
  });
});
