import { parseStatus, isTerminalStatus } from './utils';
import {
  TaskStatusUnknown,
  TaskStatusRunning,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled,
} from './types';

describe('parseStatus', () => {
  it('should return TaskStatusUnknown for null and undefined', () => {
    expect(parseStatus(null)).toBe(TaskStatusUnknown);
    expect(parseStatus(undefined)).toBe(TaskStatusUnknown);
  });

  it('should pass through numeric status values', () => {
    expect(parseStatus(TaskStatusRunning)).toBe(TaskStatusRunning);
    expect(parseStatus(TaskStatusCompleted)).toBe(TaskStatusCompleted);
  });

  it('should map lowercase string status names', () => {
    expect(parseStatus('running')).toBe(TaskStatusRunning);
    expect(parseStatus('completed')).toBe(TaskStatusCompleted);
    expect(parseStatus('COMPLETED')).toBe(TaskStatusCompleted);
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
