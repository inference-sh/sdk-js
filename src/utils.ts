/**
 * Status utilities for handling both int and string-based status values.
 * Provides future compatibility when API migrates from int to string status.
 */

import {
  TaskStatus,
  TaskStatusUnknown,
  TaskStatusReceived,
  TaskStatusQueued,
  TaskStatusDispatched,
  TaskStatusPreparing,
  TaskStatusServing,
  TaskStatusSettingUp,
  TaskStatusRunning,
  TaskStatusCancelling,
  TaskStatusUploading,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled,
} from './types';

/** Map string status names to TaskStatus values (for future string-based API) */
const STATUS_STRING_MAP: Record<string, TaskStatus> = {
  unknown: TaskStatusUnknown,
  received: TaskStatusReceived,
  queued: TaskStatusQueued,
  dispatched: TaskStatusDispatched,
  preparing: TaskStatusPreparing,
  serving: TaskStatusServing,
  setting_up: TaskStatusSettingUp,
  running: TaskStatusRunning,
  cancelling: TaskStatusCancelling,
  uploading: TaskStatusUploading,
  completed: TaskStatusCompleted,
  failed: TaskStatusFailed,
  cancelled: TaskStatusCancelled,
};

/**
 * Parse task status from int or string to TaskStatus number.
 * Handles both current int-based API and future string-based API.
 */
export function parseStatus(status: number | string | undefined | null): TaskStatus {
  if (status === undefined || status === null) {
    return TaskStatusUnknown;
  }
  if (typeof status === 'number') {
    return status as TaskStatus;
  }
  if (typeof status === 'string') {
    return STATUS_STRING_MAP[status.toLowerCase()] ?? TaskStatusUnknown;
  }
  return TaskStatusUnknown;
}

/**
 * Check if a task status is terminal (completed, failed, or cancelled).
 * Handles both int and string status values.
 */
export function isTerminalStatus(status: number | string | undefined | null): boolean {
  const parsed = parseStatus(status);
  return parsed === TaskStatusCompleted || parsed === TaskStatusFailed || parsed === TaskStatusCancelled;
}
