import {
  TaskStatusCancelled,
  TaskStatusCancelling,
  TaskStatusCompleted,
  TaskStatusDispatched,
  TaskStatusFailed,
  TaskStatusPreparing,
  TaskStatusQueued,
  TaskStatusReceived,
  TaskStatusRunning,
  TaskStatusServing,
  TaskStatusSettingUp,
  TaskStatusUnknown,
  TaskStatusUploading,
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

  it('should map lowercase string status names to TaskStatus', () => {
    expect(parseStatus('running')).toBe(TaskStatusRunning);
    expect(parseStatus('completed')).toBe(TaskStatusCompleted);
    expect(parseStatus('failed')).toBe(TaskStatusFailed);
    expect(parseStatus('cancelled')).toBe(TaskStatusCancelled);
  });

  it('should map all intermediate pipeline string statuses to TaskStatus', () => {
    expect(parseStatus('unknown')).toBe(TaskStatusUnknown);
    expect(parseStatus('received')).toBe(TaskStatusReceived);
    expect(parseStatus('queued')).toBe(TaskStatusQueued);
    expect(parseStatus('dispatched')).toBe(TaskStatusDispatched);
    expect(parseStatus('preparing')).toBe(TaskStatusPreparing);
    expect(parseStatus('serving')).toBe(TaskStatusServing);
    expect(parseStatus('setting_up')).toBe(TaskStatusSettingUp);
    expect(parseStatus('cancelling')).toBe(TaskStatusCancelling);
    expect(parseStatus('uploading')).toBe(TaskStatusUploading);
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
    expect(isTerminalStatus(TaskStatusQueued)).toBe(false);
    expect(isTerminalStatus('preparing')).toBe(false);
    expect(isTerminalStatus('uploading')).toBe(false);
    expect(isTerminalStatus(null)).toBe(false);
  });
});
