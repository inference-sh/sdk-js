import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index.js';
import * as types from './types.js';
import { SDK_VERSION } from './version.js';
import {
  heldTurn,
  pendingWait,
} from './utils.js';
import {
  InterruptReasonConfirmation,
  InterruptReasonWait,
  InterruptResourceToolInvocation,
  InterruptResourceTurn,
  InterruptStatusPending,
  InterruptStatusResolved,
  type InterruptDTO,
} from './types.js';

const root = join(__dirname, '..');

/**
 * Release 6189a56: v0.31.0 ships pendingWait (33da4b2), TaskEgress revert
 * (e86a493), and shared pendingInterrupt for heldTurn/pendingWait (45114ab).
 */
describe('release v0.31.0 (6189a56)', () => {
  it('ships version 0.31.0 while 0.30.0 remains the latest CHANGELOG section', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.31.0');
    expect(SDK_VERSION).toBe('0.31.0');

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.30\.0\]/);
    expect(changelog).toMatch(/## \[0\.30\.0\] - 2026-10-18/);
    expect(changelog).toMatch(/INF-1012/);
  });

  it('exports heldTurn and pendingWait from the main barrel', () => {
    expect(main.heldTurn).toEqual(expect.any(Function));
    expect(main.pendingWait).toEqual(expect.any(Function));
    expect(main.InterruptReasonWait).toBe('wait');
  });

  it('heldTurn and pendingWait ignore resolved interrupts of the other kind', () => {
    const resolvedHeld = {
      id: 'int-held-old',
      chat_id: 'chat-1',
      run_id: 'run-1',
      reason: InterruptReasonConfirmation,
      source: 'step_limit',
      status: InterruptStatusResolved,
      resource_id: 'run-1',
      resource_type: InterruptResourceTurn,
      meta: { steps: 1 },
    } as unknown as InterruptDTO;

    const pendingWaitInterrupt = {
      id: 'int-wait',
      chat_id: 'chat-1',
      run_id: 'run-1',
      reason: InterruptReasonWait,
      source: 'wait',
      status: InterruptStatusPending,
      resource_id: 'inv-1',
      resource_type: InterruptResourceToolInvocation,
      expires_at: '2026-10-19T14:20:00Z',
      meta: { note: 'deploy' },
    } as unknown as InterruptDTO;

    expect(heldTurn([resolvedHeld, pendingWaitInterrupt])).toBeNull();
    expect(pendingWait([resolvedHeld, pendingWaitInterrupt])).toEqual({
      interruptId: 'int-wait',
      runId: 'run-1',
      until: '2026-10-19T14:20:00Z',
      note: 'deploy',
    });

    const resolvedWait = {
      ...pendingWaitInterrupt,
      id: 'int-wait-old',
      status: InterruptStatusResolved,
    } as unknown as InterruptDTO;

    const pendingHeld = {
      ...resolvedHeld,
      id: 'int-held',
      status: InterruptStatusPending,
      meta: { steps: 5 },
    } as unknown as InterruptDTO;

    expect(pendingWait([resolvedWait, pendingHeld])).toBeNull();
    expect(heldTurn([resolvedWait, pendingHeld])).toEqual({
      interruptId: 'int-held',
      runId: 'run-1',
      steps: 5,
    });
  });
});

describe('source guards for v0.31.0 behavior', () => {
  const utilsSource = readFileSync(join(__dirname, 'utils.ts'), 'utf8');
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');

  it('heldTurn and pendingWait share pendingInterrupt with a pending status gate (45114ab)', () => {
    expect(utilsSource).toMatch(/function pendingInterrupt\(/);
    expect(utilsSource).toContain(
      'pendingInterrupt(interrupts, i => i.resource_type === InterruptResourceTurn)',
    );
    expect(utilsSource).toContain('pendingInterrupt(interrupts, i => i.reason === InterruptReasonWait)');
    expect(utilsSource).toMatch(
      /pendingInterrupt\([\s\S]*?i\.status === InterruptStatusPending && match\(i\)/,
    );
  });

  it('does not export TaskEgress after the e86a493 revert', () => {
    expect(types).not.toHaveProperty('TaskEgress');
    expect(main).not.toHaveProperty('TaskEgress');
    expect(typesSource).not.toMatch(/export interface TaskEgress\s*\{/);
    const taskDtoBlock = typesSource.match(
      /export interface TaskDTO(?: extends [^{]+)?\s*\{[\s\S]*?\n\}/,
    )?.[0];
    expect(taskDtoBlock).toBeDefined();
    expect(taskDtoBlock).not.toMatch(/\begress\b/);
  });

  it('keeps wait-tool types from 33da4b2 in the regen', () => {
    expect(typesSource).toMatch(
      /export interface InternalToolsConfig(?: extends [^{]+)?\s*\{[\s\S]*?\n\s*wait\?: boolean;/,
    );
    expect(typesSource).toMatch(
      /InterruptReasonWait is a tool call the agent made to wait[\s\S]*export const InterruptReasonWait/,
    );
  });
});
