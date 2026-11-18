import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import type { AgentRunDTO, ChatDTO, InterruptDTO, InterruptOrigin, InterruptReason } from '../types.js';
import {
  AgentRunStateInputRequired,
  InterruptReasonSubagent,
  InterruptReasonToolApproval,
  InterruptReasonWait,
  InterruptStatusPending,
} from '../types.js';
import { pendingApprovals } from '../utils.js';

/**
 * api-v1584 / v0.41.4 (INF-1291): ancestor chats surface sub-agent interrupts with origin;
 * parent runs may use interrupt_reason subagent while waiting.
 */
describe('InterruptOrigin and InterruptReasonSubagent (api-v1584)', () => {
  it('exports InterruptReasonSubagent from types and the main barrel', () => {
    expect(InterruptReasonSubagent).toBe('subagent');
    expect(main.InterruptReasonSubagent).toBe('subagent');
  });

  it('includes subagent on the InterruptReason union alongside existing reasons', () => {
    const reasons: InterruptReason[] = [
      InterruptReasonWait,
      InterruptReasonSubagent,
      InterruptReasonToolApproval,
    ];
    expect(reasons).toEqual(['wait', 'subagent', 'tool_approval']);
  });

  it('accepts InterruptOrigin on pending interrupts shown on an ancestor chat', () => {
    const origin: InterruptOrigin = {
      agent_id: 'agent-child',
      agent_ref: 'acme/researcher',
      tool_invocation_id: 'inv-delegate',
      depth: 1,
    };

    const interrupt: InterruptDTO = {
      id: 'int-ancestor',
      run_id: 'run-child',
      chat_id: 'chat-child',
      reason: InterruptReasonToolApproval,
      source: 'engine',
      status: InterruptStatusPending,
      resource_id: 'inv-child',
      origin,
    };

    const chat = {
      id: 'chat-parent',
      pending_interrupts: [interrupt],
    } as unknown as ChatDTO;

    expect(chat.pending_interrupts?.[0]?.origin).toEqual(origin);
    expect(chat.pending_interrupts?.[0]?.reason).toBe(InterruptReasonToolApproval);
  });

  it('types a parent run waiting on a sub-agent question with interrupt_reason subagent', () => {
    const run: AgentRunDTO = {
      id: 'run-parent',
      chat_id: 'chat-parent',
      state: AgentRunStateInputRequired,
      interrupt_reason: InterruptReasonSubagent,
    };

    expect(run.interrupt_reason).toBe('subagent');
    expect(run.state).toBe(AgentRunStateInputRequired);
  });

  it('still projects tool approvals when origin names the delegating sub-agent', () => {
    const chat = {
      id: 'chat-parent',
      pending_interrupts: [
        {
          id: 'int-delegated',
          run_id: 'run-child',
          chat_id: 'chat-child',
          reason: InterruptReasonToolApproval,
          source: 'engine',
          status: InterruptStatusPending,
          resource_id: 'inv-child',
          meta: {
            tool_invocation_id: 'inv-child',
            tool_name: 'fetch_url',
            arguments: { url: 'https://example.com' },
          },
          origin: {
            agent_ref: 'acme/researcher',
            tool_invocation_id: 'inv-delegate',
            depth: 1,
          },
        } as InterruptDTO,
      ],
    } as unknown as ChatDTO;

    // chat_id on the interrupt is the sub-agent chat (per InterruptDTO.origin docs), not the ancestor.
    expect(pendingApprovals(chat)).toEqual([
      {
        interruptId: 'int-delegated',
        toolInvocationId: 'inv-child',
        chatId: 'chat-child',
        toolName: 'fetch_url',
        arguments: { url: 'https://example.com' },
      },
    ]);
  });

  it('documents that subagent is a run interrupt reason, not an interrupt reason', () => {
    const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(typesSource).toContain('InterruptReasonSubagent is a run\'s reason, never an interrupt\'s');
    expect(typesSource).toContain('origin?: InterruptOrigin');
    expect(typesSource).toMatch(/\|\s*"subagent"/);
  });
});