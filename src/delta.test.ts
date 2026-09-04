import { DeltaAccumulator, type DeltaEvent } from './delta';
import type { LLMDelta, LLMDeltaEvent, LLMUsage } from './types';
import { ToolTypeFunction } from './types';

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

describe('DeltaAccumulator (field-tags driven merge)', () => {
  it('concatenates response tokens via concat strategy', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'Hello' });
    acc.apply({ response: ' ' });
    acc.apply({ response: 'world' });

    expect(acc.toOutput()).toEqual({ response: 'Hello world' });
  });

  it('concatenates reasoning tokens and omits reasoning when absent', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: '', reasoning: 'Let me ' });
    acc.apply({ response: '', reasoning: 'think...' });

    expect(acc.toOutput()).toEqual({
      response: '',
      reasoning: 'Let me think...',
    });

    const noReasoning = new DeltaAccumulator();
    noReasoning.apply({ response: 'done' });
    expect(noReasoning.toOutput()).toEqual({ response: 'done' });
    expect(noReasoning.toOutput()).not.toHaveProperty('reasoning');
  });

  it('accumulates tool calls by index with argument fragments', () => {
    const acc = new DeltaAccumulator();

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
          id: 'call_abc',
          type: 'function',
          function: { name: 'search', arguments: { query: 'weather' } },
        },
      ],
    });
  });

  it('sorts tool calls by index in toOutput', () => {
    const acc = new DeltaAccumulator();

    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 1,
          id: 'call_b',
          type: 'function',
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
          type: 'function',
          function: { name: 'first', arguments: '{}' },
        },
      ],
    });

    const output = acc.toOutput();
    expect(output.tool_calls).toHaveLength(2);
    expect(output.tool_calls![0].function.name).toBe('first');
    expect(output.tool_calls![1].function.name).toBe('second');
  });

  it('leaves arguments empty when JSON is incomplete', () => {
    const acc = new DeltaAccumulator();
    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'call_x',
          type: 'function',
          function: { name: 'incomplete', arguments: '{"key":' },
        },
      ],
    });

    expect(acc.toOutput().tool_calls![0].function.arguments).toEqual({});
  });

  it('defaults missing tool call metadata', () => {
    const acc = new DeltaAccumulator();
    acc.apply({
      response: '',
      tool_calls: [{ index: 0, function: { arguments: '{}' } }],
    });

    const tc = acc.toOutput().tool_calls![0];
    expect(tc.id).toBe('');
    expect(tc.type).toBe('function');
    expect(tc.function.name).toBe('');
  });

  it('replaces usage on each delta per replace strategy', () => {
    const acc = new DeltaAccumulator();

    acc.apply({
      response: '',
      usage: makeUsage({ completion_tokens: 5, total_tokens: 15 }),
    });
    acc.apply({
      response: '',
      usage: makeUsage({ completion_tokens: 42, total_tokens: 52, stop_reason: 'max_tokens' }),
    });

    const output = acc.toOutput();
    expect(output.usage).toEqual(
      makeUsage({ completion_tokens: 42, total_tokens: 52, stop_reason: 'max_tokens' }),
    );
  });

  it('omits usage from toOutput when none was received', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'done' });

    expect(acc.toOutput()).toEqual({ response: 'done' });
    expect(acc.toOutput()).not.toHaveProperty('usage');
  });

  it('handles interleaved response, tool call, and usage deltas', () => {
    const acc = new DeltaAccumulator();

    acc.apply({ response: 'I will ' });
    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'c1',
          type: 'function',
          function: { name: 'lookup', arguments: '{"id":1}' },
        },
      ],
    });
    acc.apply({ response: 'search.' });
    acc.apply({
      response: '',
      usage: makeUsage({ completion_tokens: 3 }),
    });

    expect(acc.toOutput()).toEqual({
      response: 'I will search.',
      tool_calls: [
        {
          id: 'c1',
          type: 'function',
          function: { name: 'lookup', arguments: { id: 1 } },
        },
      ],
      usage: makeUsage({ completion_tokens: 3 }),
    });
  });

  it('treats null delta fields as no-ops', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'a' } as LLMDelta);
    acc.apply({ response: undefined as unknown as string });

    expect(acc.toOutput().response).toBe('a');
  });
});

describe('DeltaAccumulator nested merge semantics', () => {
  it('replaces function.name and concatenates function.arguments per field tags', () => {
    const acc = new DeltaAccumulator();

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
        id: 'call_1',
        type: ToolTypeFunction,
        function: { name: 'renamed', arguments: { q: 'x' } },
      },
    ]);
  });

  it('replaces id and type on subsequent deltas for the same tool call index', () => {
    const acc = new DeltaAccumulator();

    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'call_old',
          type: ToolTypeFunction,
          function: { name: 'search', arguments: '{}' },
        },
      ],
    });
    acc.apply({
      response: '',
      tool_calls: [
        {
          index: 0,
          id: 'call_new',
          type: ToolTypeFunction,
          function: { name: 'search', arguments: '' },
        },
      ],
    });

    const tc = acc.toOutput().tool_calls![0];
    expect(tc.id).toBe('call_new');
    expect(tc.type).toBe(ToolTypeFunction);
    expect(tc.function.arguments).toEqual({});
  });
});

describe('DeltaAccumulator.seed', () => {
  it('initializes response and reasoning from progress output', () => {
    const acc = new DeltaAccumulator();
    acc.seed({ response: 'Partial ', reasoning: 'Thinking' });

    expect(acc.toOutput()).toEqual({
      response: 'Partial ',
      reasoning: 'Thinking',
    });
  });

  it('lets subsequent apply deltas append on seeded content', () => {
    const acc = new DeltaAccumulator();
    acc.seed({ response: 'Hello', reasoning: 'Let me ' });
    acc.apply({ response: ' world' });
    acc.apply({ reasoning: 'think.' });

    expect(acc.toOutput()).toEqual({
      response: 'Hello world',
      reasoning: 'Let me think.',
    });
  });

  it('only updates fields that are explicitly provided', () => {
    const acc = new DeltaAccumulator();
    acc.seed({ response: 'seeded', reasoning: 'initial' });
    acc.seed({ response: 'updated' });

    expect(acc.toOutput()).toEqual({
      response: 'updated',
      reasoning: 'initial',
    });
  });

  it('allows seeding empty strings to reset text fields', () => {
    const acc = new DeltaAccumulator();
    acc.seed({ response: 'stale', reasoning: 'stale thought' });
    acc.seed({ response: '', reasoning: '' });
    acc.apply({ reasoning: 'fresh' });

    expect(acc.toOutput()).toEqual({
      response: '',
      reasoning: 'fresh',
    });
  });

  it('does not reset accumulated tool calls when seeding text', () => {
    const acc = new DeltaAccumulator();
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
          id: 'call_1',
          type: 'function',
          function: { name: 'lookup', arguments: { id: 1 } },
        },
      ],
    });
  });
});

describe('DeltaEvent type alias', () => {
  it('is structurally LLMDeltaEvent for NDJSON wire envelopes', () => {
    const event: DeltaEvent = {
      delta: { response: 'tok' },
      seq: 42,
    };

    const parsed = JSON.parse(JSON.stringify(event)) as LLMDeltaEvent;

    expect(parsed.delta.response).toBe('tok');
    expect(parsed.seq).toBe(42);
  });
});
