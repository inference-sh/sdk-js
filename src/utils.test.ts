import {
  TaskStatusCancelled,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusRunning,
  TaskStatusUnknown,
} from './types';
import { isTerminalStatus, parseStatus } from './utils';

describe('parseStatus', () => {
  it('should return TaskStatusUnknown for null and undefined', () => {
    expect(parseStatus(null)).toBe(TaskStatusUnknown);
    expect(parseStatus(undefined)).toBe(TaskStatusUnknown);
  });

  it('should pass through numeric status values', () => {
    expect(parseStatus(TaskStatusRunning)).toBe(TaskStatusRunning);
    expect(parseStatus(TaskStatusCompleted)).toBe(TaskStatusCompleted);
  });

  it('should map known string status names case-insensitively', () => {
    expect(parseStatus('running')).toBe(TaskStatusRunning);
    expect(parseStatus('COMPLETED')).toBe(TaskStatusCompleted);
    expect(parseStatus('Failed')).toBe(TaskStatusFailed);
  });

  it('should return TaskStatusUnknown for unrecognized strings', () => {
    expect(parseStatus('not-a-real-status')).toBe(TaskStatusUnknown);
  });
});

describe('isTerminalStatus', () => {
  it('should be true for completed, failed, and cancelled', () => {
    expect(isTerminalStatus(TaskStatusCompleted)).toBe(true);
    expect(isTerminalStatus(TaskStatusFailed)).toBe(true);
    expect(isTerminalStatus(TaskStatusCancelled)).toBe(true);
    expect(isTerminalStatus('completed')).toBe(true);
  });

  it('should be false for non-terminal statuses', () => {
    expect(isTerminalStatus(TaskStatusRunning)).toBe(false);
    expect(isTerminalStatus('running')).toBe(false);
    expect(isTerminalStatus(null)).toBe(false);
  });
});
