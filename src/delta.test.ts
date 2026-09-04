import { DeltaAccumulator, type DeltaEvent } from './delta';
import type { LLMDelta, LLMDeltaEvent } from './types';

describe('DeltaAccumulator', () => {
  it('should concatenate response tokens', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'Hello' });
    acc.apply({ response: ' ' });
    acc.apply({ response: 'world' });

    expect(acc.toOutput()).toEqual({ response: 'Hello world' });
  });

  it('should concatenate reasoning tokens', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: '', reasoning: 'Let me ' });
    acc.apply({ response: '', reasoning: 'think...' });

    expect(acc.toOutput()).toEqual({
      response: '',
      reasoning: 'Let me think...',
    });
  });

  it('should omit reasoning when none was received', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'done' });

    expect(acc.toOutput()).toEqual({ response: 'done' });
    expect(acc.toOutput()).not.toHaveProperty('reasoning');
  });

  it('should accumulate tool calls by index with argument fragments', () => {
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

  it('should sort tool calls by index in toOutput', () => {
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

  it('should leave arguments empty when JSON is incomplete', () => {
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

  it('should default missing tool call metadata', () => {
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

  it('should handle interleaved response and tool call deltas', () => {
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
    acc.apply({ response: 'search for that.' });

    expect(acc.toOutput()).toEqual({
      response: 'I will search for that.',
      tool_calls: [
        {
          id: 'c1',
          type: 'function',
          function: { name: 'lookup', arguments: { id: 1 } },
        },
      ],
    });
  });

  it('should treat missing response field as empty string', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'a' } as LLMDelta);
    acc.apply({ response: undefined as unknown as string });

    expect(acc.toOutput().response).toBe('a');
  });
});

describe('DeltaEvent type alias (v0.7.104 refactor)', () => {
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
