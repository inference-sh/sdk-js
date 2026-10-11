import * as main from '../index.js';
import { ErrorCodePaymentMethodRequired } from '../types.js';

describe('bounty error codes (37077ba)', () => {
  it('exports ErrorCodePaymentMethodRequired for bounty 402 responses', () => {
    expect(ErrorCodePaymentMethodRequired).toBe('payment_method_required');
    expect(main.ErrorCodePaymentMethodRequired).toBe('payment_method_required');
  });
});
