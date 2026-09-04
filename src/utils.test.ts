import {
  TaskStatusCancelled,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusRunning,
  TaskStatusUnknown,
  AgentRunStateWorking,
  AgentRunStateSubmitted,
  AgentRunStateCompleted,
  AgentRunStateFailed,
  AgentRunStateInputRequired,
} from './types';
import type { ChatDTO, AgentRunDTO, InterruptDTO } from './types';
import {
  InterruptReasonToolApproval,
  InterruptReasonWidget,
  InterruptStatusPending,
  InterruptStatusResolved,
} from './types';
import { isTerminalStatus, parseStatus, isChatBusy, pendingApprovals } from './utils';

describe('pendingApprovals', () => {
  const interrupt = (overrides: Partial<InterruptDTO>): InterruptDTO =>
    ({
      id: 'int-1',
      chat_id: 'chat-1',
      run_id: 'run-1',
      reason: InterruptReasonToolApproval,
      status: InterruptStatusPending,
      resource_id: 'inv-1',
      meta: { tool_invocation_id: 'inv-1', tool_name: 'deploy', arguments: { env: 'prod' }, reason: InterruptReasonToolApproval },
      ...overrides,
    }) as unknown as InterruptDTO;

  it('projects pending tool-approval interrupts', () => {
    const chat = { id: 'chat-1', pending_interrupts: [interrupt({})] } as unknown as ChatDTO;
    expect(pendingApprovals(chat)).toEqual([
      { interruptId: 'int-1', toolInvocationId: 'inv-1', chatId: 'chat-1', toolName: 'deploy', arguments: { env: 'prod' } },
    ]);
  });

  it('ignores resolved interrupts and non-approval reasons', () => {
    const chat = {
      id: 'chat-1',
      pending_interrupts: [
        interrupt({ id: 'int-r', status: InterruptStatusResolved }),
        interrupt({ id: 'int-w', reason: InterruptReasonWidget }),
      ],
    } as unknown as ChatDTO;
    expect(pendingApprovals(chat)).toEqual([]);
  });

  it('handles string-encoded meta and missing meta', () => {
    const chat = {
      id: 'chat-1',
      pending_interrupts: [
        interrupt({ id: 'int-s', meta: JSON.stringify({ tool_name: 'charge', arguments: { amount: 9 } }) as unknown as InterruptDTO['meta'] }),
        interrupt({ id: 'int-n', resource_id: 'inv-n', meta: undefined }),
      ],
    } as unknown as ChatDTO;
    const got = pendingApprovals(chat);
    expect(got[0].toolName).toBe('charge');
    expect(got[0].arguments).toEqual({ amount: 9 });
    expect(got[1]).toMatchObject({ toolInvocationId: 'inv-n', toolName: '', arguments: {} });
  });

  it('returns empty for null chat or no interrupts', () => {
    expect(pendingApprovals(null)).toEqual([]);
    expect(pendingApprovals({ id: 'c' } as unknown as ChatDTO)).toEqual([]);
  });
});

describe('parseStatus', () => {
  it('should return TaskStatusUnknown for null and undefined', () => {
    expect(parseStatus(null)).toBe(TaskStatusUnknown);
    expect(parseStatus(undefined)).toBe(TaskStatusUnknown);
  });

  it('should pass through numeric status values', () => {
    expect(parseStatus(TaskStatusRunning)).toBe(TaskStatusRunning);
    expect(parseStatus(TaskStatusCompleted)).toBe(TaskStatusCompleted);
  });

  it('should map lowercase string status names to TaskStatus', () => {
    expect(parseStatus('running')).toBe(TaskStatusRunning);
    expect(parseStatus('completed')).toBe(TaskStatusCompleted);
    expect(parseStatus('failed')).toBe(TaskStatusFailed);
    expect(parseStatus('cancelled')).toBe(TaskStatusCancelled);
  });

  it('should be case-insensitive for string statuses', () => {
    expect(parseStatus('COMPLETED')).toBe(TaskStatusCompleted);
    expect(parseStatus('Running')).toBe(TaskStatusRunning);
  });

  it('should return TaskStatusUnknown for unrecognized strings', () => {
    expect(parseStatus('not_a_real_status')).toBe(TaskStatusUnknown);
  });

  it('should return TaskStatusUnknown for non-string non-number values', () => {
    expect(parseStatus(true as unknown as string)).toBe(TaskStatusUnknown);
  });
});

describe('isTerminalStatus', () => {
  it('should be true for completed, failed, and cancelled (int or string)', () => {
    expect(isTerminalStatus(TaskStatusCompleted)).toBe(true);
    expect(isTerminalStatus(TaskStatusFailed)).toBe(true);
    expect(isTerminalStatus(TaskStatusCancelled)).toBe(true);
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('should be false for non-terminal statuses', () => {
    expect(isTerminalStatus(TaskStatusRunning)).toBe(false);
    expect(isTerminalStatus('running')).toBe(false);
    expect(isTerminalStatus(null)).toBe(false);
  });
});

describe('isChatBusy', () => {
  const chatWithRun = (state: string) =>
    ({ active_run: { state } as AgentRunDTO } as unknown as ChatDTO);
  const chatWithStatus = (status: string) =>
    ({ status } as unknown as ChatDTO);

  it('should prefer active_run.state when present', () => {
    expect(isChatBusy(chatWithRun(AgentRunStateWorking))).toBe(true);
    expect(isChatBusy(chatWithRun(AgentRunStateSubmitted))).toBe(true);
    expect(isChatBusy(chatWithRun(AgentRunStateInputRequired))).toBe(true);
    expect(isChatBusy(chatWithRun(AgentRunStateCompleted))).toBe(false);
    expect(isChatBusy(chatWithRun(AgentRunStateFailed))).toBe(false);
  });

  it('should fall back to chat.status when no active_run', () => {
    expect(isChatBusy(chatWithStatus('busy'))).toBe(true);
    expect(isChatBusy(chatWithStatus('awaiting_input'))).toBe(true);
    expect(isChatBusy(chatWithStatus('idle'))).toBe(false);
    expect(isChatBusy(chatWithStatus('completed'))).toBe(false);
  });

  it('should return false for null/undefined chat', () => {
    expect(isChatBusy(null)).toBe(false);
    expect(isChatBusy(undefined)).toBe(false);
  });
});
