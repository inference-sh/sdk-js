/**
 * Status utilities for handling both int and string-based status values.
 * Provides future compatibility when API migrates from int to string status.
 */

import { InterruptReasonToolApproval, InterruptReasonWait, InterruptResourceTurn, InterruptStatusPending } from './types.js';
import type { ApprovalRequiredPayload, InterruptDTO } from './types.js';

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
  TaskStatusRejected,
  AgentRunStateWorking,
  AgentRunStateSubmitted,
  AgentRunStateInputRequired,
  AgentRunStateAuthRequired,
  AgentRunStateCompleted,
  AgentRunStateFailed,
  AgentRunStateCanceled,
  AgentRunStateRejected,
  ChatMessageStatusReady,
  ChatMessageStatusFailed,
  ChatMessageStatusCancelled,
  ChatStatusBusy,
  ChatStatusAwaitingInput,
  ChatStatusWaiting,
} from './types.js';
import type { AgentRunDTO, AgentRunState, ChatDTO, ChatMessageStatus } from './types.js';

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
  rejected: TaskStatusRejected,
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
 * Check if a task status is terminal (completed, failed, cancelled, or rejected).
 * Handles both int and string status values.
 */
export function isTerminalStatus(status: number | string | undefined | null): boolean {
  const parsed = parseStatus(status);
  return parsed === TaskStatusCompleted || parsed === TaskStatusFailed || parsed === TaskStatusCancelled || parsed === TaskStatusRejected;
}

// Run and message state predicates. Ports of the Go methods AgentRunState.IsTerminal/
// IsInterrupted/IsSettled and ChatMessageStatus.IsTerminal; every consumer uses these.

export function isRunTerminal(state: AgentRunState | null | undefined): boolean {
  return state === AgentRunStateCompleted || state === AgentRunStateFailed || state === AgentRunStateCanceled || state === AgentRunStateRejected;
}

/** Parked on a human: a tool approval or input (input_required) or an authorization (auth_required). */
export function isRunInterrupted(state: AgentRunState | null | undefined): boolean {
  return state === AgentRunStateInputRequired || state === AgentRunStateAuthRequired;
}

/** Paused on the agent's own wait call: it resumes at its deadline or on a message, so nobody has to act. */
export function isRunWaiting(run: Pick<AgentRunDTO, 'state' | 'interrupt_reason'> | null | undefined): boolean {
  return !!run && isRunInterrupted(run.state) && run.interrupt_reason === InterruptReasonWait;
}

/** The run produces no further events this turn: terminal or interrupted. */
export function isRunSettled(state: AgentRunState | null | undefined): boolean {
  return isRunTerminal(state) || isRunInterrupted(state);
}

/** The run is executing: submitted or working. */
export function isRunWorking(state: AgentRunState | null | undefined): boolean {
  return state === AgentRunStateWorking || state === AgentRunStateSubmitted;
}

export function isMessageTerminal(status: ChatMessageStatus | null | undefined): boolean {
  return status === ChatMessageStatusReady || status === ChatMessageStatusFailed || status === ChatMessageStatusCancelled;
}

/** The turn is still open: the run is working, waiting, or parked on a human (approval, input, authorization). */
export function isChatBusy(chat: ChatDTO | null | undefined): boolean {
  const run = chat?.active_run;
  if (run) {
    return isRunWorking(run.state) || isRunInterrupted(run.state);
  }
  return chat?.status === ChatStatusBusy || chat?.status === ChatStatusAwaitingInput || chat?.status === ChatStatusWaiting;
}

/** The chat is blocked on a human: nothing more arrives until someone approves, answers or authorizes. */
export function isAwaitingHuman(chat: ChatDTO | null | undefined): boolean {
  const run = chat?.active_run;
  if (run) return isRunInterrupted(run.state) && !isRunWaiting(run);
  return chat?.status === ChatStatusAwaitingInput;
}

/** A tool invocation gated on human approval, projected from the chat's pending interrupts. */
export type PendingApproval = {
  interruptId: string;
  toolInvocationId: string;
  chatId: string;
  toolName: string;
  arguments: Record<string, unknown>;
};

/** An interrupt's meta, which arrives as an object or a JSON string. */
function parseMeta<T>(interrupt: InterruptDTO): Partial<T> {
  const meta = interrupt.meta as unknown;
  if (!meta) return {};
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta) as T;
    } catch {
      return {};
    }
  }
  return meta as T;
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
    const meta = parseMeta<ApprovalRequiredPayload>(interrupt);
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

/** A run's next turn held for the person (InterruptResourceTurn): after a long stretch without them, it waits for "keep going" (allow) or "stop" (deny). */
export type HeldTurn = {
  interruptId: string;
  runId: string;
  /** Steps the run took without the person, when the api says. */
  steps: number | null;
};

/** The first pending interrupt among a run's that matches. */
function pendingInterrupt(interrupts: InterruptDTO[] | null | undefined, match: (i: InterruptDTO) => boolean): InterruptDTO | undefined {
  return interrupts?.find(i => i.status === InterruptStatusPending && match(i));
}

/** The held turn among a run's pending interrupts, if one is held. */
export function heldTurn(interrupts: InterruptDTO[] | null | undefined): HeldTurn | null {
  const interrupt = pendingInterrupt(interrupts, i => i.resource_type === InterruptResourceTurn);
  if (!interrupt) return null;
  const { steps } = parseMeta<{ steps: number }>(interrupt);
  return { interruptId: interrupt.id, runId: interrupt.run_id, steps: typeof steps === 'number' ? steps : null };
}

/** The interrupt a tool call awaiting approval waits on, among a chat's or a run's pending interrupts. */
export function approvalInterrupt(interrupts: InterruptDTO[] | null | undefined, toolInvocationId: string): InterruptDTO | undefined {
  return pendingInterrupt(
    interrupts,
    i => i.reason === InterruptReasonToolApproval && (i.resource_id || parseMeta<ApprovalRequiredPayload>(i).tool_invocation_id) === toolInvocationId,
  );
}

/** A run paused by its agent's wait tool (InterruptReasonWait): it continues at `until`, or sooner when the person ends the wait ("continue now", allow) or cancels it (deny). */
export type PendingWait = {
  interruptId: string;
  runId: string;
  /** When the wait ends, RFC3339; null when the api gives no deadline. */
  until: string | null;
  /** What the agent said it will do when the wait ends. */
  note: string;
};

/** The wait among a run's pending interrupts, if the run is waiting. */
export function pendingWait(interrupts: InterruptDTO[] | null | undefined): PendingWait | null {
  const interrupt = pendingInterrupt(interrupts, i => i.reason === InterruptReasonWait);
  if (!interrupt) return null;
  const { note } = parseMeta<{ note: string }>(interrupt);
  return { interruptId: interrupt.id, runId: interrupt.run_id, until: interrupt.expires_at ?? null, note: typeof note === 'string' ? note : '' };
}
