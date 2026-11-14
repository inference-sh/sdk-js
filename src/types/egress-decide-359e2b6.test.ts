import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  EngineCapabilityEgressDecide,
  EngineCapabilityEgressGrants,
  EngineCapabilityEgressPending,
  type EngineCapability,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/** types regen 359e2b6: egress_decide engine capability for gateway hold/answer wire (INF-1173). */
describe('EngineCapabilityEgressDecide (359e2b6 / INF-1173)', () => {
  it('extends EngineCapability with egress_decide after egress_grants', () => {
    expect(typesSource).toMatch(/\| "egress_grants"\s*\n\s*\| "egress_decide";/);
    expect(typesSource).toMatch(
      /export const EngineCapabilityEgressDecide: EngineCapability = "egress_decide";/,
    );

    const caps: EngineCapability[] = [
      EngineCapabilityEgressPending,
      EngineCapabilityEgressGrants,
      EngineCapabilityEgressDecide,
    ];
    expect(caps).toEqual(['egress_pending', 'egress_grants', 'egress_decide']);
    expect(main.EngineCapabilityEgressDecide).toBe('egress_decide');
  });

  it('documents observed egress traffic, hold/resend fields, and egress_answer / egress_revoke', () => {
    expect(typesSource).toMatch(/EgressResolveRequest\.Observed/);
    expect(typesSource).toMatch(/HoldUntil, HoldOffMs,\s*\n \* MaxHoldMs, Resend/);
    expect(typesSource).toMatch(/egress_answer and acks egress_revoke \(INF-1173\)/);
  });
});
