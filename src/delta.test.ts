import { DeltaAccumulator } from './delta';
import type { LLMDelta } from './types';

describe('DeltaAccumulator', () => {
  it('accumulates response text across multiple deltas', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'Hello' } as LLMDelta);
    acc.apply({ response: ', ' } as LLMDelta);
    acc.apply({ response: 'world' } as LLMDelta);
    expect(acc.toOutput().response).toBe('Hello, world');
  });

  it('initializes with empty response', () => {
    const acc = new DeltaAccumulator();
    expect(acc.toOutput().response).toBe('');
  });

  it('omits reasoning when no reasoning deltas are received', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'hi' } as LLMDelta);
    expect(acc.toOutput().reasoning).toBeUndefined();
  });

  it('accumulates reasoning text', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: '', reasoning: 'think' } as LLMDelta);
    acc.apply({ response: '', reasoning: 'ing' } as LLMDelta);
    expect(acc.toOutput().reasoning).toBe('thinking');
  });

  it('omits tool_calls when no tool call deltas are received', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: 'hi' } as LLMDelta);
    expect(acc.toOutput().tool_calls).toBeUndefined();
  });

  it('accumulates a single tool call with streamed arguments', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: '', tool_calls: [{ index: 0, id: 'tc-1', type: 'function', function: { name: 'get_weather', arguments: '{"lo' } }] } as LLMDelta);
    acc.apply({ response: '', tool_calls: [{ index: 0, function: { arguments: 'c":"NYC"}' } }] } as LLMDelta);

    const output = acc.toOutput();
    expect(output.tool_calls).toHaveLength(1);
    expect(output.tool_calls![0].id).toBe('tc-1');
    expect(output.tool_calls![0].function.name).toBe('get_weather');
    expect(output.tool_calls![0].function.arguments).toEqual({ loc: 'NYC' });
  });

  it('accumulates multiple tool calls by index', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: '', tool_calls: [{ index: 0, id: 'tc-a', type: 'function', function: { name: 'fn_a', arguments: '{"x":1}' } }] } as LLMDelta);
    acc.apply({ response: '', tool_calls: [{ index: 1, id: 'tc-b', type: 'function', function: { name: 'fn_b', arguments: '{"y":2}' } }] } as LLMDelta);

    const output = acc.toOutput();
    expect(output.tool_calls).toHaveLength(2);
    expect(output.tool_calls![0].function.name).toBe('fn_a');
    expect(output.tool_calls![1].function.name).toBe('fn_b');
  });

  it('returns empty arguments object when tool call arguments are not yet valid JSON', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: '', tool_calls: [{ index: 0, id: 'tc-1', type: 'function', function: { name: 'fn', arguments: '{"partial' } }] } as LLMDelta);

    const output = acc.toOutput();
    expect(output.tool_calls![0].function.arguments).toEqual({});
  });

  it('sorts tool calls by index in output', () => {
    const acc = new DeltaAccumulator();
    // arrive out of order
    acc.apply({ response: '', tool_calls: [{ index: 1, id: 'tc-b', type: 'function', function: { name: 'fn_b', arguments: '{}' } }] } as LLMDelta);
    acc.apply({ response: '', tool_calls: [{ index: 0, id: 'tc-a', type: 'function', function: { name: 'fn_a', arguments: '{}' } }] } as LLMDelta);

    const output = acc.toOutput();
    expect(output.tool_calls![0].function.name).toBe('fn_a');
    expect(output.tool_calls![1].function.name).toBe('fn_b');
  });

  it('defaults id to empty string and type to function when absent', () => {
    const acc = new DeltaAccumulator();
    acc.apply({ response: '', tool_calls: [{ index: 0, function: { name: 'fn', arguments: '{}' } }] } as LLMDelta);

    const output = acc.toOutput();
    expect(output.tool_calls![0].id).toBe('');
    expect(output.tool_calls![0].type).toBe('function');
  });
});
