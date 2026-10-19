import * as main from '../index.js';
import { InterruptResourceTurn } from '../types.js';

/** types regen c056862: InterruptResourceTurn gates a run's next model turn. */
describe('InterruptResourceTurn (c056862)', () => {
  it('exports the turn resource constant on types and the main barrel', () => {
    expect(InterruptResourceTurn).toBe('turn');
    expect(main.InterruptResourceTurn).toBe('turn');
  });
});
