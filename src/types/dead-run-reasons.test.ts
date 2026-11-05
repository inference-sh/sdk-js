import * as main from '../index.js';
import {
  DeadRunReasonModelStoppedEarly,
  DeadRunReasonModelEmptyReply,
  DeadRunReasonModelOutputLimit,
  DeadRunReasonModelRefused,
  DeadRunReasonProviderError,
  DeadRunReasonNoProgress,
  DeadRunReasonPlatformError,
  DeadRunSourceModel,
  DeadRunSourceProvider,
  DeadRunSourcePlatform,
} from '../types.js';

/**
 * types regen 97ff75f: DeadRunReason/DeadRunSource classify why and by whom
 * an agent run ended without delivering its owed output.
 */
describe('DeadRunReason and DeadRunSource constants (97ff75f)', () => {
  it('exports all DeadRunReason constants with correct values', () => {
    expect(DeadRunReasonModelStoppedEarly).toBe('model_stopped_early');
    expect(DeadRunReasonModelEmptyReply).toBe('model_empty_reply');
    expect(DeadRunReasonModelOutputLimit).toBe('model_output_limit');
    expect(DeadRunReasonModelRefused).toBe('model_refused');
    expect(DeadRunReasonProviderError).toBe('provider_error');
    expect(DeadRunReasonNoProgress).toBe('no_progress');
    expect(DeadRunReasonPlatformError).toBe('platform_error');
  });

  it('exports all DeadRunSource constants with correct values', () => {
    expect(DeadRunSourceModel).toBe('model');
    expect(DeadRunSourceProvider).toBe('provider');
    expect(DeadRunSourcePlatform).toBe('platform');
  });

  it('re-exports DeadRunReason and DeadRunSource constants on the main barrel', () => {
    expect(main.DeadRunReasonModelStoppedEarly).toBe('model_stopped_early');
    expect(main.DeadRunReasonModelEmptyReply).toBe('model_empty_reply');
    expect(main.DeadRunReasonModelOutputLimit).toBe('model_output_limit');
    expect(main.DeadRunReasonModelRefused).toBe('model_refused');
    expect(main.DeadRunReasonProviderError).toBe('provider_error');
    expect(main.DeadRunReasonNoProgress).toBe('no_progress');
    expect(main.DeadRunReasonPlatformError).toBe('platform_error');
    expect(main.DeadRunSourceModel).toBe('model');
    expect(main.DeadRunSourceProvider).toBe('provider');
    expect(main.DeadRunSourcePlatform).toBe('platform');
  });
});
