import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EngineCapabilityEgressGateway,
  type EngineCapabilities,
  type EngineCapability,
  type EngineDTO,
} from '../types.js';

/**
 * Engine capability scheduling (INF-1076 / af4fc95): engines report
 * capabilities; tasks may require them; the scheduler matches subsets.
 */
describe('EngineCapability types (af4fc95)', () => {
  it('exports EngineCapabilityEgressGateway from the main barrel', () => {
    expect(main.EngineCapabilityEgressGateway).toBe('egress_gateway');
    expect(EngineCapabilityEgressGateway).toBe('egress_gateway');
  });

  it('keeps capability literals stable for engine telemetry and task requires', () => {
    const reported: EngineCapabilities = [EngineCapabilityEgressGateway];
    const required: EngineCapability[] = ['egress_gateway'];
    expect(reported).toEqual(required);
    expect([...reported]).toEqual(['egress_gateway']);
  });

  it('accepts optional capabilities on EngineDTO (nil and empty mean none)', () => {
    const without: Pick<EngineDTO, 'capabilities'> = {};
    const empty: Pick<EngineDTO, 'capabilities'> = { capabilities: [] };
    const withEgress: Pick<EngineDTO, 'capabilities'> = {
      capabilities: [EngineCapabilityEgressGateway],
    };

    expect(without.capabilities).toBeUndefined();
    expect(empty.capabilities).toEqual([]);
    expect(withEgress.capabilities?.[0]).toBe('egress_gateway');
  });

  it('keeps EngineDTO.capabilities typed as EngineCapabilities in types.ts', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(source).toMatch(
      /export interface EngineDTO extends BaseModelDTO, PermissionModelDTO \{[\s\S]*?capabilities\?: EngineCapabilities;/
    );
    expect(source).toMatch(
      /export type EngineCapability = "egress_gateway";/
    );
    expect(source).toMatch(
      /export const EngineCapabilityEgressGateway: EngineCapability = "egress_gateway";/
    );
  });
});
