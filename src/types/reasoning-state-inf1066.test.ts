import { readFileSync } from 'fs';
import { join } from 'path';
import { createLLMDeltaAccumulator } from '../delta.js';
import {
  ChatMessageRoleAssistant,
  ChatMessageRoleUser,
  type LLMContextMessage,
  type LLMDelta,
  type LLMOutput,
  type ReasoningState,
} from '../types.js';

/**
 * types regen 2a64e73 (INF-1066): opaque per-provider reasoning_state on final
 * LLM output and assistant context messages for multi-model replay; not on
 * streaming LLMDelta.
 */
describe('ReasoningState on LLM envelopes (2a64e73 / INF-1066)', () => {
  it('carries opaque provider entries on LLMOutput for the next request', () => {
    const state: ReasoningState = {
      anthropic: { signature: 'sig-abc', thinking_block_id: 'tb_1' },
      openai: { encrypted_reasoning: 'blob' },
    };

    const output: LLMOutput = {
      response: 'Done.',
      reasoning: 'internal chain',
      reasoning_state: state,
    };

    expect(output.reasoning_state?.anthropic).toEqual({
      signature: 'sig-abc',
      thinking_block_id: 'tb_1',
    });
    expect(output.reasoning_state?.openai).toEqual({ encrypted_reasoning: 'blob' });
  });

  it('round-trips reasoning_state on assistant LLMContextMessage entries', () => {
    const assistant: LLMContextMessage = {
      role: ChatMessageRoleAssistant,
      text: 'Answer',
      reasoning: 'thought',
      reasoning_state: { gemini: { thought_signature: 'ts-9' } },
    };
    const user: LLMContextMessage = {
      role: ChatMessageRoleUser,
      text: 'Question',
    };

    const context: LLMContextMessage[] = [user, assistant];
    expect(context[1].reasoning_state).toEqual({ gemini: { thought_signature: 'ts-9' } });
    expect(context[0].reasoning_state).toBeUndefined();
  });

  it('keeps streaming LLMDelta limited to response, reasoning, tool_calls, and usage', () => {
    const delta: LLMDelta = {
      response: 'partial',
      reasoning: 'partial thought',
      tool_calls: [{ index: 0, function: { arguments: '{}' } }],
    };

    expect(delta).not.toHaveProperty('reasoning_state');
    expect(Object.keys(delta).sort()).toEqual(['reasoning', 'response', 'tool_calls']);
  });

  it('accumulates only LLMDelta fields (no reasoning_state slot on streamed output)', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'Hi', reasoning: 'think' });
    acc.apply({ response: ' there' });

    expect(acc.toOutput()).toEqual({ response: 'Hi there', reasoning: 'think' });
    expect(acc.toOutput()).not.toHaveProperty('reasoning_state');
  });
});

describe('types.ts regen guards for reasoning_state (2a64e73 / INF-1066)', () => {
  const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('documents ReasoningState and wires it on LLMOutput and LLMContextMessage only', () => {
    expect(source).toMatch(/export type ReasoningState = \{ \[key: string\]: any\}/);

    const llmOutput = source.match(/export interface LLMOutput \{[\s\S]*?\n\}/);
    expect(llmOutput).not.toBeNull();
    expect(llmOutput![0]).toMatch(/reasoning_state\?: ReasoningState/);

    const contextMsg = source.match(/export interface LLMContextMessage \{[\s\S]*?\n\}/);
    expect(contextMsg).not.toBeNull();
    expect(contextMsg![0]).toMatch(/reasoning_state\?: ReasoningState/);

    const llmDelta = source.match(/export interface LLMDelta extends StreamDelta \{[\s\S]*?\n\}/);
    expect(llmDelta).not.toBeNull();
    expect(llmDelta![0]).not.toMatch(/reasoning_state/);

    const llmInput = source.match(/export interface LLMInput extends LLMSettings \{[\s\S]*?\n\}/);
    expect(llmInput).not.toBeNull();
    expect(llmInput![0]).not.toMatch(/reasoning_state/);
  });

  it('keeps reasoning_state out of LLMDelta_fieldTags merge metadata', () => {
    const tags = source.match(/export const LLMDelta_fieldTags = \{[\s\S]*?\} as const/);
    expect(tags).not.toBeNull();
    expect(tags![0]).not.toMatch(/reasoning_state/);
    expect(tags![0]).toMatch(/reasoning: \{merge: "concat"\}/);
  });

  it('documents that reasoning_state is whole only on final LLMOutput', () => {
    expect(source).toMatch(/Not on LLMDelta: the state is whole only on the final output/);
  });
});
