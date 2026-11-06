import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import * as main from '../index.js';
import {
  DeadRunReasonModelEmptyReply,
  DeadRunReasonModelOutputLimit,
  DeadRunReasonModelRefused,
  DeadRunReasonModelStoppedEarly,
  DeadRunReasonNoProgress,
  DeadRunReasonOwnerSetup,
  DeadRunReasonPlatformError,
  DeadRunReasonProviderError,
  type DeadRunReason,
  DeadRunSourceModel,
  DeadRunSourceOwner,
  DeadRunSourcePlatform,
  DeadRunSourceProvider,
  type DeadRunSource,
} from '../types.js';

describe('DeadRun owner_setup reason and owner source (dac32b4)', () => {
  it('exports DeadRunReasonOwnerSetup with stable literal owner_setup', () => {
    expect(DeadRunReasonOwnerSetup).toBe('owner_setup');
    expect(main.DeadRunReasonOwnerSetup).toBe('owner_setup');
  });

  it('exports DeadRunSourceOwner with stable literal owner (distinct from reason string)', () => {
    expect(DeadRunSourceOwner).toBe('owner');
    expect(main.DeadRunSourceOwner).toBe('owner');
    expect(DeadRunReasonOwnerSetup).not.toBe(DeadRunSourceOwner);
  });

  it('keeps DeadRunReason string literals stable including owner_setup', () => {
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

  it('keeps DeadRunSource string literals stable including owner', () => {
    const sources: DeadRunSource[] = [
      DeadRunSourceModel,
      DeadRunSourceProvider,
      DeadRunSourcePlatform,
      DeadRunSourceOwner,
    ];
    expect(sources).toEqual(['model', 'provider', 'platform', 'owner']);
  });

  it('documents ClassifyDeadRun next to DeadRunReason / DeadRunSource in types.ts', () => {
    const typesSrc = readFileSync(
      join(process.cwd(), 'src/types.ts'),
      'utf8',
    );
    expect(typesSrc).toContain('ClassifyDeadRun');
    expect(typesSrc).toContain(
      '* DeadRunReason is why an ended agent run counts as dead',
    );
  });
});
