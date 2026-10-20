import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import { InterruptReasonWait } from '../types.js';

/**
 * pendingWait (33da4b2): wait-tool interrupts, InternalToolsConfig.wait,
 * and per-tool approval_timeout on AgentTool DTOs.
 */
describe('pending wait types (33da4b2)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('exports InterruptReasonWait from types and the main barrel', () => {
    expect(InterruptReasonWait).toBe('wait');
    expect(main.InterruptReasonWait).toBe('wait');
  });

  it('keeps InternalToolsConfig.wait in the regen', () => {
    expect(typesSource).toMatch(
      /export interface InternalToolsConfig(?: extends [^{]+)?\s*\{[\s\S]*?\n\s*wait\?: boolean;/,
    );
  });

  it('keeps approval_timeout on AgentTool and AgentToolDTO', () => {
    expect(typesSource).toMatch(
      /export interface AgentTool(?: extends [^{]+)?\s*\{[\s\S]*?\n\s*approval_timeout\?: number/,
    );
    expect(typesSource).toMatch(
      /export interface AgentToolDTO(?: extends [^{]+)?\s*\{[\s\S]*?\n\s*approval_timeout\?: number/,
    );
  });

  it('documents InterruptReasonWait as a wait-tool pause', () => {
    expect(typesSource).toMatch(
      /InterruptReasonWait is a tool call the agent made to wait[\s\S]*export const InterruptReasonWait/,
    );
  });
});
