import { readFileSync } from 'fs';
import { join } from 'path';
import { chatReducer, initialState } from '../agent/reducer.js';
import {
  ToolInvocationStatusInProgress,
  ToolTypeFunction,
  type ChatDTO,
  type ChatMessageDTO,
  type ToolInvocationDTO,
} from '../types.js';

/**
 * types regen 51877b5: ToolInvocationDTO may include optional action — the
 * model's imperative phrase for what the call does; omitted when not provided.
 */
describe('ToolInvocationDTO.action (51877b5)', () => {
  const baseInvocation = {
    id: 'ti-1',
    short_id: 'ti-1',
    created_at: '2026-10-26T10:00:00Z',
    updated_at: '2026-10-26T10:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: 'private',
    chat_message_id: 'msg-1',
    tool_invocation_id: 'ti-1',
    type: ToolTypeFunction,
    display_name: 'Gmail search',
    function: { name: 'gmail_search', arguments: { query: 'from:alice' } },
    status: ToolInvocationStatusInProgress,
  } satisfies ToolInvocationDTO;

  it('types optional action as the model imperative phrase', () => {
    const invocation: ToolInvocationDTO = {
      ...baseInvocation,
      action: 'Fetch unread emails from alice@x.com',
    };
    expect(invocation.action).toBe('Fetch unread emails from alice@x.com');
    expect(invocation.display_name).toBe('Gmail search');
  });

  it('allows legacy tool rows without action', () => {
    const legacy: ToolInvocationDTO = { ...baseInvocation };
    expect(legacy).not.toHaveProperty('action');
  });

  it('allows payloads where the model omitted the phrase (field absent)', () => {
    const withoutPhrase: Pick<ToolInvocationDTO, 'display_name' | 'function' | 'status'> = {
      display_name: 'Calendar',
      function: { name: 'list_events', arguments: {} },
      status: ToolInvocationStatusInProgress,
    };
    expect(withoutPhrase).not.toHaveProperty('action');
  });
});

describe('chat reducer ToolInvocationDTO.action (51877b5)', () => {
  function messageWithTool(action?: string): ChatMessageDTO {
    return {
      id: 'msg-tool',
      short_id: 'msg-tool',
      created_at: '2026-10-26T10:00:00Z',
      updated_at: '2026-10-26T10:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      chat_id: 'chat-1',
      order: 1,
      status: 'ready',
      role: 'assistant',
      content: [{ type: 'text', text: 'Working on it' }],
      tool_invocations: [
        {
          id: 'ti-1',
          short_id: 'ti-1',
          created_at: '2026-10-26T10:00:00Z',
          updated_at: '2026-10-26T10:00:00Z',
          user_id: 'user-1',
          team_id: 'team-1',
          visibility: 'private',
          chat_message_id: 'msg-tool',
          tool_invocation_id: 'ti-1',
          type: ToolTypeFunction,
          display_name: 'Search mail',
          ...(action !== undefined ? { action } : {}),
          function: { name: 'search', arguments: {} },
          status: ToolInvocationStatusInProgress,
        },
      ],
    } as ChatMessageDTO;
  }

  const chatWithMessage = (msg: ChatMessageDTO): ChatDTO =>
    ({
      id: 'chat-1',
      short_id: 'c1',
      created_at: '2026-10-26T10:00:00Z',
      updated_at: '2026-10-26T10:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      status: 'busy',
      name: 'Test',
      description: '',
      children: [],
      chat_messages: [msg],
      agent_data: {} as ChatDTO['agent_data'],
    }) as ChatDTO;

  it('SET_CHAT keeps action on tool_invocations for UI labels', () => {
    const msg = messageWithTool('Summarize the thread from last week');
    const next = chatReducer(initialState, {
      type: 'SET_CHAT',
      payload: chatWithMessage(msg),
    });

    expect(next.messages[0]?.tool_invocations?.[0]?.action).toBe(
      'Summarize the thread from last week',
    );
  });

  it('UPDATE_MESSAGE partial merge keeps action when status updates', () => {
    const msg = messageWithTool('Look up the customer record');
    let state = chatReducer(initialState, {
      type: 'SET_CHAT',
      payload: chatWithMessage(msg),
    });

    state = chatReducer(state, {
      type: 'UPDATE_MESSAGE',
      payload: {
        id: 'msg-tool',
        status: 'ready',
        tool_invocations: msg.tool_invocations,
      } as ChatMessageDTO,
      partial: true,
    });

    expect(state.messages[0]?.tool_invocations?.[0]?.action).toBe('Look up the customer record');
    expect(state.messages[0]?.status).toBe('ready');
  });

  it('UPDATE_MESSAGE replace preserves action on the invocation row', () => {
    const msg = messageWithTool('Delete the draft message');
    let state = chatReducer(initialState, {
      type: 'SET_CHAT',
      payload: chatWithMessage(msg),
    });

    const replaced = {
      ...msg,
      content: [{ type: 'text', text: 'Done' }],
      tool_invocations: [
        {
          ...msg.tool_invocations![0],
          status: 'completed',
          result: 'ok',
        },
      ],
    } as ChatMessageDTO;

    state = chatReducer(state, { type: 'UPDATE_MESSAGE', payload: replaced });

    expect(state.messages[0]?.tool_invocations?.[0]?.action).toBe('Delete the draft message');
    expect(state.messages[0]?.tool_invocations?.[0]?.status).toBe('completed');
  });
});

describe('types.ts regen guards (51877b5)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  function interfaceBlock(name: string): string {
    const start = typesSource.indexOf(`export interface ${name}`);
    expect(start).toBeGreaterThanOrEqual(0);
    const slice = typesSource.slice(start);
    const end = slice.indexOf('\nexport ');
    return end === -1 ? slice : slice.slice(0, end);
  }

  it('documents action on ToolInvocationDTO as an optional imperative phrase', () => {
    const block = interfaceBlock('ToolInvocationDTO');
    expect(block).toMatch(/Action is what the model said the call does/);
    expect(block).toMatch(/imperative phrase/);
    expect(block).toMatch(/\baction\?: string/);
    expect(block).toMatch(/Empty when it left it out/);
  });

  it('keeps action optional and separate from display_name', () => {
    const block = interfaceBlock('ToolInvocationDTO');
    expect(block).not.toMatch(/\baction: string/);
    expect(block).toMatch(/\bdisplay_name\?: string/);
    expect(block.indexOf('display_name')).toBeLessThan(block.indexOf('action'));
  });
});

describe('MCP elicit action vs ToolInvocationDTO.action (51877b5)', () => {
  const mcpSource = readFileSync(join(__dirname, '../agent/mcp-input.ts'), 'utf8');

  it('uses elicit response.action for MCP accept/decline, not ToolInvocationDTO.action', () => {
    expect(mcpSource).toMatch(/response\.action === 'accept'/);
    expect(mcpSource).not.toMatch(/invocation\.action/);
    expect(mcpSource).not.toMatch(/ToolInvocationDTO\.action/);
  });
});
