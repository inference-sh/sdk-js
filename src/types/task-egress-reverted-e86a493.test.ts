import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import * as types from '../types.js';
import { EngineCapabilityEgressGateway } from '../types.js';

/**
 * e86a493 reverts e3d216f (models v0.8.121): TaskEgress and TaskDTO.egress
 * were pulled from the regen until the API ships task egress metering again.
 */
describe('TaskEgress reverted (e86a493)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('does not export TaskEgress from types or the main barrel', () => {
    expect(types).not.toHaveProperty('TaskEgress');
    expect(main).not.toHaveProperty('TaskEgress');
  });

  it('keeps engine egress_gateway capability separate from per-task byte counters', () => {
    expect(EngineCapabilityEgressGateway).toBe('egress_gateway');
    expect(typesSource).toMatch(/export const EngineCapabilityEgressGateway/);
    expect(typesSource).not.toMatch(/export interface TaskEgress\s*\{/);
    expect(typesSource).not.toMatch(/\n\s*egress\?: TaskEgress;/);
  });

  it('does not add an egress field on TaskDTO in the regen', () => {
    const taskDtoBlock = typesSource.match(
      /export interface TaskDTO(?: extends [^{]+)?\s*\{[\s\S]*?\n\}/,
    )?.[0];
    expect(taskDtoBlock).toBeDefined();
    expect(taskDtoBlock).not.toMatch(/\begress\b/);
  });
});
