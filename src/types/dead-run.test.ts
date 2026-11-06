import * as main from '../index.js';
import {
  DeadRunReasonModelStoppedEarly,
  DeadRunReasonModelEmptyReply,
  DeadRunReasonModelOutputLimit,
  DeadRunReasonModelRefused,
  DeadRunReasonProviderError,
  DeadRunReasonNoProgress,
  DeadRunReasonPlatformError,
  DeadRunReasonOwnerSetup,
  DeadRunSourceModel,
  DeadRunSourceProvider,
  DeadRunSourcePlatform,
  DeadRunSourceOwner,
  type DeadRunReason,
  type DeadRunSource,
} from '../types.js';

describe('dead-run types (dac32b4)', () => {
  it('keeps DeadRunReason string literals stable', () => {
    const reasons: DeadRunReason[] = [
      DeadRunReasonModelStoppedEarly,
      DeadRunReasonModelEmptyReply,
      DeadRunReasonModelOutputLimit,
      DeadRunReasonModelRefused,
      DeadRunReasonProviderError,
      DeadRunReasonNoProgress,
      DeadRunReasonPlatformError,
      DeadRunReasonOwnerSetup,
    ];
    expect(reasons).toEqual([
      'model_stopped_early',
      'model_empty_reply',
      'model_output_limit',
      'model_refused',
      'provider_error',
      'no_progress',
      'platform_error',
      'owner_setup',
    ]);
  });

  it('keeps DeadRunSource string literals stable', () => {
    const sources: DeadRunSource[] = [
      DeadRunSourceModel,
      DeadRunSourceProvider,
      DeadRunSourcePlatform,
      DeadRunSourceOwner,
    ];
    expect(sources).toEqual(['model', 'provider', 'platform', 'owner']);
  });

  it('exports DeadRunReasonOwnerSetup from the main barrel', () => {
    expect(main.DeadRunReasonOwnerSetup).toBe('owner_setup');
    expect(main.DeadRunSourceOwner).toBe('owner');
  });

  it('exports all DeadRunReason constants from the main barrel', () => {
    expect(main.DeadRunReasonModelStoppedEarly).toBe('model_stopped_early');
    expect(main.DeadRunReasonModelEmptyReply).toBe('model_empty_reply');
    expect(main.DeadRunReasonModelOutputLimit).toBe('model_output_limit');
    expect(main.DeadRunReasonModelRefused).toBe('model_refused');
    expect(main.DeadRunReasonProviderError).toBe('provider_error');
    expect(main.DeadRunReasonNoProgress).toBe('no_progress');
    expect(main.DeadRunReasonPlatformError).toBe('platform_error');
  });

  it('exports all DeadRunSource constants from the main barrel', () => {
    expect(main.DeadRunSourceModel).toBe('model');
    expect(main.DeadRunSourceProvider).toBe('provider');
    expect(main.DeadRunSourcePlatform).toBe('platform');
  });
});
