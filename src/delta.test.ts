import {
  DeltaAccumulator,
  createLLMDeltaAccumulator,
  type DeltaEvent,
  type FieldTags,
  type FieldTagsRegistry,
} from './delta';
import {
  LLMDelta_fieldTags,
  MergeStrategyConcat,
  MergeStrategyIndexed,
  MergeStrategyNested,
  MergeStrategyReplace,
  ToolCallDelta_fieldTags,
  ToolCallFunctionDelta_fieldTags,
  ToolTypeFunction,
} from './types';
import type { LLMDeltaEvent, LLMUsage } from './types';

function makeUsage(overrides: Partial<LLMUsage> = {}): LLMUsage {
  return {
    stop_reason: 'end_turn',
    time_to_first_token: 0.1,
    tokens_per_second: 50,
    prompt_tokens: 10,
    completion_tokens: 5,
    total_tokens: 15,
    reasoning_tokens: 0,
    reasoning_time: 0,
    ...overrides,
  };
}

describe('createLLMDeltaAccumulator', () => {
  it('concatenates response and reasoning tokens via field tags', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'Hello' });
    acc.apply({ response: ' ' });
    acc.apply({ reasoning: 'Let me ' });
    acc.apply({ reasoning: 'think.' });

    expect(acc.toOutput()).toEqual({
      response: 'Hello ',
      reasoning: 'Let me think.',
    });
  });

  it('accumulates tool calls by index with raw argument fragments', () => {
    const acc = createLLMDeltaAccumulator();

    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'call_abc',
          type: 'function',
          function: { name: 'search', arguments: '{"query":' },
        },
      ],
    });
    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          function: { arguments: '"weather"}' },
        },
      ],
    });

    expect(acc.toOutput()).toEqual({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'call_abc',
          type: 'function',
          function: { name: 'search', arguments: '{"query":"weather"}' },
        },
      ],
    });
  });

  it('sorts indexed tool calls and replaces id/type per field tags', () => {
    const acc = createLLMDeltaAccumulator();

    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 1,
          id: 'call_b',
          type: ToolTypeFunction,
          function: { name: 'second', arguments: '{}' },
        },
      ],
    });
    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'call_a',
          type: ToolTypeFunction,
          function: { name: 'first', arguments: '{}' },
        },
        {
          index: 1,
          id: 'call_b_new',
          type: ToolTypeFunction,
          function: { name: 'second', arguments: '' },
        },
      ],
    });

    const output = acc.toOutput();
    expect(output.tool_calls).toHaveLength(2);
    expect(output.tool_calls[0].function.name).toBe('first');
    expect(output.tool_calls[1].id).toBe('call_b_new');
  });

  it('replaces usage on each delta per replace strategy', () => {
    const acc = createLLMDeltaAccumulator();

    acc.apply({
      response: '',
      usage: makeUsage({ completion_tokens: 5, total_tokens: 15 }),
    });
    acc.apply({
      response: '',
      usage: makeUsage({ completion_tokens: 42, total_tokens: 52, stop_reason: 'max_tokens' }),
    });

    expect(acc.toOutput().usage).toEqual(
      makeUsage({ completion_tokens: 42, total_tokens: 52, stop_reason: 'max_tokens' }),
    );
  });

  it('treats null delta fields as no-ops', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'a' });
    acc.apply({ response: undefined as unknown as string });

    expect(acc.toOutput().response).toBe('a');
  });
});

describe('DeltaAccumulator nested merge via registry', () => {
  it('replaces function.name and concatenates function.arguments per nested tags', () => {
    const acc = createLLMDeltaAccumulator();

    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'call_1',
          type: ToolTypeFunction,
          function: { name: 'lookup', arguments: '{"q":' },
        },
      ],
    });
    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          function: { name: 'renamed', arguments: '"x"}' },
        },
      ],
    });

    expect(acc.toOutput().tool_calls).toEqual([
      {
        index: 0,
        id: 'call_1',
        type: ToolTypeFunction,
        function: { name: 'renamed', arguments: '{"q":"x"}' },
      },
    ]);
  });
});

describe('DeltaAccumulator.seed', () => {
  it('initializes any provided fields from progress output', () => {
    const acc = createLLMDeltaAccumulator();
    acc.seed({ response: 'Partial ', reasoning: 'Thinking' });

    expect(acc.toOutput()).toEqual({
      response: 'Partial ',
      reasoning: 'Thinking',
    });
  });

  it('lets subsequent apply deltas append on seeded content', () => {
    const acc = createLLMDeltaAccumulator();
    acc.seed({ response: 'Hello', reasoning: 'Let me ' });
    acc.apply({ response: ' world' });
    acc.apply({ reasoning: 'think.' });

    expect(acc.toOutput()).toEqual({
      response: 'Hello world',
      reasoning: 'Let me think.',
    });
  });

  it('only updates fields that are explicitly provided', () => {
    const acc = createLLMDeltaAccumulator();
    acc.seed({ response: 'seeded', reasoning: 'initial' });
    acc.seed({ response: 'updated' });

    expect(acc.toOutput()).toEqual({
      response: 'updated',
      reasoning: 'initial',
    });
  });

  it('does not reset accumulated tool calls when seeding text', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'call_1',
          type: 'function',
          function: { name: 'lookup', arguments: '{"id":1}' },
        },
      ],
    });
    acc.seed({ response: 'synced from progress' });

    expect(acc.toOutput()).toEqual({
      response: 'synced from progress',
      tool_calls: [
        {
          index: 0,
          id: 'call_1',
          type: 'function',
          function: { name: 'lookup', arguments: '{"id":1}' },
        },
      ],
    });
  });
});

describe('DeltaAccumulator generic constructor', () => {
  it('merges fields using provided tags without a registry', () => {
    const tags: FieldTags = {
      text: { merge: MergeStrategyConcat },
      count: { merge: MergeStrategyReplace },
    };
    const acc = new DeltaAccumulator(tags);

    acc.apply({ text: 'a', count: 1 });
    acc.apply({ text: 'b', count: 2 });

    expect(acc.toOutput()).toEqual({ text: 'ab', count: 2 });
  });

  it('defaults untagged fields to replace strategy', () => {
    const tags: FieldTags = {
      text: { merge: MergeStrategyConcat },
    };
    const acc = new DeltaAccumulator(tags);

    acc.apply({ text: 'hello', extra: 'first' });
    acc.apply({ extra: 'second' });

    expect(acc.toOutput()).toEqual({ text: 'hello', extra: 'second' });
  });

  it('resolves nested child tags through the registry chain', () => {
    const parentTags: FieldTags = {
      nested: { merge: MergeStrategyNested },
    };
    const childTags: FieldTags = {
      value: { merge: MergeStrategyConcat },
    };
    const registry: FieldTagsRegistry = new Map();
    registry.set(parentTags, childTags);

    const acc = new DeltaAccumulator(parentTags, registry);
    acc.apply({ nested: { value: 'a' } });
    acc.apply({ nested: { value: 'b' } });

    expect(acc.toOutput()).toEqual({ nested: { value: 'ab' } });
  });

  it('resolves indexed child tags through the registry chain', () => {
    const parentTags: FieldTags = {
      items: { merge: MergeStrategyIndexed },
    };
    const itemTags: FieldTags = {
      label: { merge: MergeStrategyConcat },
    };
    const registry: FieldTagsRegistry = new Map();
    registry.set(parentTags, itemTags);

    const acc = new DeltaAccumulator(parentTags, registry);
    acc.apply({ items: [{ index: 0, label: 'a' }] });
    acc.apply({ items: [{ index: 0, label: 'b' }] });

    expect(acc.toOutput()).toEqual({
      items: [{ index: 0, label: 'ab' }],
    });
  });

  it('wires the LLM field tag registry for tool call nesting', () => {
    const registry: FieldTagsRegistry = new Map();
    registry.set(LLMDelta_fieldTags as FieldTags, ToolCallDelta_fieldTags as FieldTags);
    registry.set(ToolCallDelta_fieldTags as FieldTags, ToolCallFunctionDelta_fieldTags as FieldTags);

    const acc = new DeltaAccumulator(LLMDelta_fieldTags as FieldTags, registry);
    acc.apply({
      tool_calls: [
        {
          index: 0,
          function: { name: 'fn', arguments: '{"a":' },
        },
      ],
    });
    acc.apply({
      tool_calls: [
        {
          index: 0,
          function: { arguments: '1}' },
        },
      ],
    });

    expect(acc.toOutput().tool_calls[0].function.arguments).toBe('{"a":1}');
  });
});

describe('DeltaAccumulator.toOutput', () => {
  it('returns a shallow copy of accumulated state', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'hello' });

    const first = acc.toOutput();
    const second = acc.toOutput();

    expect(first).toEqual({ response: 'hello' });
    expect(second).not.toBe(first);
    first.response = 'mutated';
    expect(acc.toOutput().response).toBe('hello');
  });
});

describe('DeltaEvent export', () => {
  it('is structurally compatible with LLMDeltaEvent wire envelopes', () => {
    const event: DeltaEvent = {
      delta: { response: 'tok' },
      seq: 42,
    };

    const parsed = JSON.parse(JSON.stringify(event)) as LLMDeltaEvent;

    expect(parsed.delta.response).toBe('tok');
    expect(parsed.seq).toBe(42);
  });
});
