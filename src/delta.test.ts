import { DeltaAccumulator } from './delta';
import type { LLMDelta } from './types';

describe('DeltaAccumulator', () => {
  describe('apply', () => {
    it('accumulates response text across multiple deltas', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'Hello' });
      acc.apply({ response: ', ' });
      acc.apply({ response: 'world' });
      expect(acc.toOutput().response).toBe('Hello, world');
    });

    it('accumulates reasoning text', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: '', reasoning: 'Step 1. ' });
      acc.apply({ response: '', reasoning: 'Step 2.' });
      expect(acc.toOutput().reasoning).toBe('Step 1. Step 2.');
    });

    it('omits reasoning from output when none was received', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'hi' });
      expect(acc.toOutput()).not.toHaveProperty('reasoning');
    });

    it('accumulates tool call arguments across deltas', () => {
      const acc = new DeltaAccumulator();
      // First delta: metadata
      acc.apply({
        response: '',
        tool_calls: [{ index: 0, id: 'call-1', type: 'function', function: { name: 'my_tool', arguments: '{"ke' } }],
      });
      // Second delta: arguments continuation
      acc.apply({
        response: '',
        tool_calls: [{ index: 0, function: { arguments: 'y":"val"}' } }],
      });
      const output = acc.toOutput();
      expect(output.tool_calls).toHaveLength(1);
      expect(output.tool_calls![0]).toEqual({
        id: 'call-1',
        type: 'function',
        function: { name: 'my_tool', arguments: { key: 'val' } },
      });
    });

    it('handles multiple concurrent tool calls by index', () => {
      const acc = new DeltaAccumulator();
      acc.apply({
        response: '',
        tool_calls: [
          { index: 1, id: 'call-b', type: 'function', function: { name: 'tool_b', arguments: '{"b":2}' } },
          { index: 0, id: 'call-a', type: 'function', function: { name: 'tool_a', arguments: '{"a":1}' } },
        ],
      });
      const output = acc.toOutput();
      expect(output.tool_calls).toHaveLength(2);
      // Must be sorted by index
      expect(output.tool_calls![0].id).toBe('call-a');
      expect(output.tool_calls![1].id).toBe('call-b');
    });

    it('leaves tool call arguments empty when JSON is not yet complete', () => {
      const acc = new DeltaAccumulator();
      acc.apply({
        response: '',
        tool_calls: [{ index: 0, id: 'call-1', type: 'function', function: { name: 'tool', arguments: '{"partial' } }],
      });
      const output = acc.toOutput();
      expect(output.tool_calls![0].function.arguments).toEqual({});
    });

    it('uses empty string for id and "function" for type when missing', () => {
      const acc = new DeltaAccumulator();
      acc.apply({
        response: '',
        tool_calls: [{ index: 0, function: { name: 'tool', arguments: '{}' } }],
      });
      const output = acc.toOutput();
      expect(output.tool_calls![0].id).toBe('');
      expect(output.tool_calls![0].type).toBe('function');
    });

    it('omits tool_calls from output when none were received', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'hi' });
      expect(acc.toOutput()).not.toHaveProperty('tool_calls');
    });

    it('treats missing response as empty string', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: undefined as unknown as string });
      expect(acc.toOutput().response).toBe('');
    });
  });

  describe('toOutput', () => {
    it('returns a valid LLMOutput on a fresh accumulator', () => {
      const acc = new DeltaAccumulator();
      const output = acc.toOutput();
      expect(output).toEqual({ response: '' });
    });

    it('can be called multiple times and returns consistent results', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'hello' });
      expect(acc.toOutput()).toEqual(acc.toOutput());
    });

    it('delta with all fields produces complete LLMOutput', () => {
      const delta: LLMDelta = {
        response: 'Result',
        reasoning: 'Because X',
        tool_calls: [{ index: 0, id: 'c1', type: 'function', function: { name: 'fn', arguments: '{"x":1}' } }],
      };
      const acc = new DeltaAccumulator();
      acc.apply(delta);
      expect(acc.toOutput()).toEqual({
        response: 'Result',
        reasoning: 'Because X',
        tool_calls: [{ id: 'c1', type: 'function', function: { name: 'fn', arguments: { x: 1 } } }],
      });
    });
  });
});
