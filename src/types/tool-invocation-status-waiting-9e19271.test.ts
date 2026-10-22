import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ToolInvocationStatusAwaitingApproval,
  ToolInvocationStatusAwaitingInput,
  ToolInvocationStatusInProgress,
  ToolInvocationStatusWaiting,
  type ToolInvocationDTO,
  type ToolInvocationStatus,
} from '../types.js';

/**
 * types regen 9e19271: ToolInvocationStatus "waiting" for wait-tool invocations
 * while the run is paused on InterruptReasonWait.
 */
describe('ToolInvocationStatus waiting (9e19271)', () => {
  it('exports ToolInvocationStatusWaiting from types and the main barrel', () => {
    expect(ToolInvocationStatusWaiting).toBe('waiting');
    expect(main.ToolInvocationStatusWaiting).toBe('waiting');
  });

  it('keeps waiting distinct from in-flight and approval/input states', () => {
    const active: ToolInvocationStatus[] = [
      ToolInvocationStatusInProgress,
      ToolInvocationStatusAwaitingInput,
      ToolInvocationStatusAwaitingApproval,
      ToolInvocationStatusWaiting,
    ];
    expect(active).toEqual(['in_progress', 'awaiting_input', 'awaiting_approval', 'waiting']);
    expect(ToolInvocationStatusWaiting).not.toBe(ToolInvocationStatusAwaitingInput);
    expect(ToolInvocationStatusWaiting).not.toBe(ToolInvocationStatusAwaitingApproval);
  });

  it('types ToolInvocationDTO.status as waiting for wait-tool rows', () => {
    const invocation: Pick<ToolInvocationDTO, 'status' | 'tool_invocation_id'> = {
      tool_invocation_id: 'ti-wait-1',
      status: ToolInvocationStatusWaiting,
    };
    expect(invocation.status).toBe('waiting');
  });
});

describe('types.ts regen guards (9e19271)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('adds waiting to the ToolInvocationStatus union and exports a constant', () => {
    expect(typesSource).toMatch(
      /export type ToolInvocationStatus =[\s\S]*\| "awaiting_approval"[\s\S]*\| "waiting"[\s\S]*\| "completed"/,
    );
    expect(typesSource).toMatch(
      /export const ToolInvocationStatusWaiting: ToolInvocationStatus = "waiting";/,
    );
  });
});

describe('client tool dispatch vs waiting status (9e19271)', () => {
  const actionsSource = readFileSync(join(__dirname, '../agent/actions.ts'), 'utf8');

  it('still dispatches client tools only for in_progress and awaiting_input', () => {
    expect(actionsSource).toMatch(
      /invocation\.status === ToolInvocationStatusInProgress \|\| invocation\.status === ToolInvocationStatusAwaitingInput/,
    );
    expect(actionsSource).not.toMatch(/ToolInvocationStatusWaiting/);
  });
});
