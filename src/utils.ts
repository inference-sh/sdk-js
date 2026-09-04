/**
 * Status utilities for handling both int and string-based status values.
 * Provides future compatibility when API migrates from int to string status.
 */

import { InterruptReasonToolApproval, InterruptStatusPending } from './types';
import type { ApprovalRequiredPayload, InterruptDTO } from './types';

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
  AgentRunStateWorking,
  AgentRunStateSubmitted,
  AgentRunStateInputRequired,
  ChatStatusBusy,
  ChatStatusAwaitingInput,
} from './types';
import type { ChatDTO } from './types';

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

export function isChatBusy(chat: ChatDTO | null | undefined): boolean {
  const run = chat?.active_run;
  if (run) {
    return run.state === AgentRunStateWorking || run.state === AgentRunStateSubmitted || run.state === AgentRunStateInputRequired;
  }
  return chat?.status === ChatStatusBusy || chat?.status === ChatStatusAwaitingInput;
}

/** A tool invocation gated on human approval, projected from the chat's pending interrupts. */
export type PendingApproval = {
  interruptId: string;
  toolInvocationId: string;
  chatId: string;
  toolName: string;
  arguments: Record<string, unknown>;
};

function parseApprovalMeta(interrupt: InterruptDTO): Partial<ApprovalRequiredPayload> {
  const meta = interrupt.meta as unknown;
  if (!meta) return {};
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta) as ApprovalRequiredPayload;
    } catch {
      return {};
    }
  }
  return meta as ApprovalRequiredPayload;
}

/**
 * Tool approvals the chat is currently waiting on. Reads `chat.pending_interrupts`,
 * which the API projects onto the chat, so no message scan is needed.
 */
export function pendingApprovals(chat: ChatDTO | null | undefined): PendingApproval[] {
  const interrupts = chat?.pending_interrupts ?? [];
  const out: PendingApproval[] = [];
  for (const interrupt of interrupts) {
    if (interrupt.reason !== InterruptReasonToolApproval || interrupt.status !== InterruptStatusPending) {
      continue;
    }
    const meta = parseApprovalMeta(interrupt);
    out.push({
      interruptId: interrupt.id,
      toolInvocationId: interrupt.resource_id ?? meta.tool_invocation_id ?? '',
      chatId: interrupt.chat_id || chat?.id || '',
      toolName: meta.tool_name ?? '',
      arguments: (meta.arguments as Record<string, unknown>) ?? {},
    });
  }
  return out;
}
