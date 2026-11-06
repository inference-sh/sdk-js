import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  DeadRunReasonModelEmptyReply,
  DeadRunReasonModelOutputLimit,
  DeadRunReasonModelRefused,
  DeadRunReasonModelStoppedEarly,
  DeadRunReasonNoProgress,
  DeadRunReasonPlatformError,
  DeadRunReasonProviderError,
  DeadRunSourceModel,
  DeadRunSourcePlatform,
  DeadRunSourceProvider,
  type DeadRunReason,
  type DeadRunSource,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 97ff75f: DeadRunReason / DeadRunSource for classifying ended
 * agent runs (what happened vs who caused it via ClassifyDeadRun on the API).
 */
describe('dead run classification types (97ff75f)', () => {
  it('exports DeadRunReason constants from types and the main barrel', () => {
    expect(DeadRunReasonModelStoppedEarly).toBe('model_stopped_early');
    expect(DeadRunReasonModelEmptyReply).toBe('model_empty_reply');
    expect(DeadRunReasonModelOutputLimit).toBe('model_output_limit');
    expect(DeadRunReasonModelRefused).toBe('model_refused');
    expect(DeadRunReasonProviderError).toBe('provider_error');
    expect(DeadRunReasonNoProgress).toBe('no_progress');
    expect(DeadRunReasonPlatformError).toBe('platform_error');

    expect(main.DeadRunReasonModelStoppedEarly).toBe('model_stopped_early');
    expect(main.DeadRunReasonModelEmptyReply).toBe('model_empty_reply');
    expect(main.DeadRunReasonModelOutputLimit).toBe('model_output_limit');
    expect(main.DeadRunReasonModelRefused).toBe('model_refused');
    expect(main.DeadRunReasonProviderError).toBe('provider_error');
    expect(main.DeadRunReasonNoProgress).toBe('no_progress');
    expect(main.DeadRunReasonPlatformError).toBe('platform_error');
  });

  it('exports DeadRunSource constants from types and the main barrel', () => {
    expect(DeadRunSourceModel).toBe('model');
    expect(DeadRunSourceProvider).toBe('provider');
    expect(DeadRunSourcePlatform).toBe('platform');
    expect(main.DeadRunSourceModel).toBe('model');
    expect(main.DeadRunSourceProvider).toBe('provider');
    expect(main.DeadRunSourcePlatform).toBe('platform');
  });

  it('keeps dead-run reason literals stable for run analytics UX', () => {
    const reasons: DeadRunReason[] = [
      DeadRunReasonModelStoppedEarly,
      DeadRunReasonModelEmptyReply,
      DeadRunReasonModelOutputLimit,
      DeadRunReasonModelRefused,
      DeadRunReasonProviderError,
      DeadRunReasonNoProgress,
      DeadRunReasonPlatformError,
    ];
    expect(reasons).toEqual([
      'model_stopped_early',
      'model_empty_reply',
      'model_output_limit',
      'model_refused',
      'provider_error',
      'no_progress',
      'platform_error',
    ]);
  });

  it('keeps dead-run source literals stable and distinct from reasons', () => {
    const sources: DeadRunSource[] = [
      DeadRunSourceModel,
      DeadRunSourceProvider,
      DeadRunSourcePlatform,
    ];
    expect(sources).toEqual(['model', 'provider', 'platform']);
    expect(sources).not.toContain(DeadRunReasonProviderError);
    expect(sources).not.toContain(DeadRunReasonPlatformError);
  });

  it('types DeadRunReason and DeadRunSource for dashboards branching on cause', () => {
    const modelReason: DeadRunReason = DeadRunReasonModelStoppedEarly;
    const providerReason: DeadRunReason = DeadRunReasonProviderError;
    const platformReason: DeadRunReason = DeadRunReasonNoProgress;

    const modelSource: DeadRunSource = DeadRunSourceModel;
    const providerSource: DeadRunSource = DeadRunSourceProvider;
    const platformSource: DeadRunSource = DeadRunSourcePlatform;

    expect(modelReason).toBe('model_stopped_early');
    expect(providerReason).toBe('provider_error');
    expect(platformReason).toBe('no_progress');
    expect(modelSource).toBe('model');
    expect(providerSource).toBe('provider');
    expect(platformSource).toBe('platform');
  });

  it('documents DeadRunReason, DeadRunSource, and ClassifyDeadRun in types.ts', () => {
    expect(typesSource).toMatch(
      /export type DeadRunReason =\s*\n\s*\| "model_stopped_early"/,
    );
    expect(typesSource).toMatch(/\| "platform_error";/);
    expect(typesSource).toMatch(
      /export const DeadRunReasonModelStoppedEarly: DeadRunReason = "model_stopped_early";/,
    );
    expect(typesSource).toMatch(
      /export const DeadRunReasonPlatformError: DeadRunReason = "platform_error";/,
    );
    expect(typesSource).toMatch(/export type DeadRunSource = "model" \| "provider" \| "platform";/);
    expect(typesSource).toMatch(/export const DeadRunSourcePlatform: DeadRunSource = "platform";/);
    expect(typesSource).toMatch(/ClassifyDeadRun/);
    expect(typesSource).toMatch(/DeadRunSource\) follows from it \(ClassifyDeadRun\)/);
    expect(typesSource).toMatch(/never set on its own/);
  });
});
