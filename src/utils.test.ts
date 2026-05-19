import {
  TaskStatusUnknown,
  TaskStatusRunning,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled,
} from './types';
import { parseStatus, isTerminalStatus } from './utils';

describe('parseStatus', () => {
  it('returns TaskStatusUnknown for null and undefined', () => {
    expect(parseStatus(null)).toBe(TaskStatusUnknown);
    expect(parseStatus(undefined)).toBe(TaskStatusUnknown);
  });

  it('passes through numeric status values', () => {
    expect(parseStatus(TaskStatusRunning)).toBe(TaskStatusRunning);
    expect(parseStatus(TaskStatusCompleted)).toBe(TaskStatusCompleted);
  });

  it('maps lowercase string status names to TaskStatus', () => {
    expect(parseStatus('running')).toBe(TaskStatusRunning);
    expect(parseStatus('COMPLETED')).toBe(TaskStatusCompleted);
    expect(parseStatus('Failed')).toBe(TaskStatusFailed);
    expect(parseStatus('cancelled')).toBe(TaskStatusCancelled);
  });

  it('returns TaskStatusUnknown for unrecognized strings', () => {
    expect(parseStatus('not-a-real-status')).toBe(TaskStatusUnknown);
    expect(parseStatus('')).toBe(TaskStatusUnknown);
  });
});

describe('isTerminalStatus', () => {
  it('returns true for completed, failed, and cancelled (int or string)', () => {
    expect(isTerminalStatus(TaskStatusCompleted)).toBe(true);
    expect(isTerminalStatus(TaskStatusFailed)).toBe(true);
    expect(isTerminalStatus(TaskStatusCancelled)).toBe(true);
    expect(isTerminalStatus('completed')).toBe(true);
    expect(isTerminalStatus('failed')).toBe(true);
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('returns false for non-terminal statuses', () => {
    expect(isTerminalStatus(TaskStatusRunning)).toBe(false);
    expect(isTerminalStatus('running')).toBe(false);
    expect(isTerminalStatus(null)).toBe(false);
  });
});
