import * as main from '../index.js';
import {
  AgentRunStateCompleted,
  ChatEventTypeRunEnded,
  RunEndReasonNoReply,
  RunEndReasonOutputLimit,
  RunEndReasonRefusal,
  type ChatEvent,
  type ChatRunEvent,
  type RunEndReason,
} from '../types.js';

/**
 * types regen 25db234: RunEndReasonRefusal when a provider safety system ends
 * the model's last turn (BuildContext excludes those messages on later turns).
 */
describe('RunEndReason refusal (25db234)', () => {
  it('exports RunEndReasonRefusal from types and the main barrel', () => {
    expect(RunEndReasonRefusal).toBe('refusal');
    expect(main.RunEndReasonRefusal).toBe('refusal');
  });

  it('keeps RunEndReason literals distinct for run_ended handling', () => {
    const reasons: RunEndReason[] = [
      RunEndReasonOutputLimit,
      RunEndReasonNoReply,
      RunEndReasonRefusal,
    ];
    expect(reasons).toEqual(['output_limit', 'no_reply', 'refusal']);
    expect(new Set(reasons).size).toBe(3);
  });

  it('types ChatRunEvent.reason as refusal on run_ended events', () => {
    const run: ChatRunEvent = {
      run_id: 'run-refusal-1',
      state: AgentRunStateCompleted,
      reason: RunEndReasonRefusal,
      duration_ms: 42,
    };
    const event: ChatEvent = {
      type: ChatEventTypeRunEnded,
      run,
    };
    expect(event.run?.reason).toBe('refusal');
  });
});
