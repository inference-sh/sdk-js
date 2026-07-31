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
import type { ChatDTO, AgentRunDTO } from './types';
import { isTerminalStatus, parseStatus, isChatBusy } from './utils';

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
  const chatWith = (state: string) =>
    ({ active_run: { state } as AgentRunDTO } as unknown as ChatDTO);

  it('should return true for working and submitted', () => {
    expect(isChatBusy(chatWith(AgentRunStateWorking))).toBe(true);
    expect(isChatBusy(chatWith(AgentRunStateSubmitted))).toBe(true);
  });

  it('should return false for terminal and interrupted states', () => {
    expect(isChatBusy(chatWith(AgentRunStateCompleted))).toBe(false);
    expect(isChatBusy(chatWith(AgentRunStateFailed))).toBe(false);
    expect(isChatBusy(chatWith(AgentRunStateInputRequired))).toBe(false);
  });

  it('should return false when no active run', () => {
    expect(isChatBusy({ active_run: undefined } as unknown as ChatDTO)).toBe(false);
  });

  it('should return false for null/undefined chat', () => {
    expect(isChatBusy(null)).toBe(false);
    expect(isChatBusy(undefined)).toBe(false);
  });
});
