import * as main from '../index';
import { ErrorCodePaymentMethodRequired } from '../types';

describe('bounty error codes (37077ba)', () => {
  it('exports ErrorCodePaymentMethodRequired for bounty 402 responses', () => {
    expect(ErrorCodePaymentMethodRequired).toBe('payment_method_required');
    expect(main.ErrorCodePaymentMethodRequired).toBe('payment_method_required');
  });
});
