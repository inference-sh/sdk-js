import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * heldTurn and pendingWait share pendingInterrupt (45114ab): only pending
 * interrupts qualify, with a shared finder so status filtering stays consistent.
 */
describe('pending interrupt finder (45114ab)', () => {
  const utilsSource = readFileSync(join(__dirname, 'utils.ts'), 'utf8');

  it('routes heldTurn and pendingWait through pendingInterrupt', () => {
    expect(utilsSource).toMatch(/function pendingInterrupt\(/);
    expect(utilsSource).toContain(
      'pendingInterrupt(interrupts, i => i.resource_type === InterruptResourceTurn)',
    );
    expect(utilsSource).toContain('pendingInterrupt(interrupts, i => i.reason === InterruptReasonWait)');
    expect(utilsSource).toMatch(
      /pendingInterrupt\([\s\S]*?i\.status === InterruptStatusPending && match\(i\)/,
    );
  });
});
