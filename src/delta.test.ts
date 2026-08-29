import { DeltaAccumulator } from './delta';

describe('DeltaAccumulator', () => {
  describe('apply', () => {
    it('accumulates response tokens', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'Hello' });
      acc.apply({ response: ', world' });
      expect(acc.toOutput().response).toBe('Hello, world');
    });

    it('accumulates reasoning tokens', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ reasoning: 'step 1 ' });
      acc.apply({ reasoning: 'step 2' });
      expect(acc.toOutput().reasoning).toBe('step 1 step 2');
    });

    it('omits reasoning from output when empty', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'hi' });
      expect(acc.toOutput().reasoning).toBeUndefined();
    });

    it('treats missing response as empty string', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'a' });
      acc.apply({});
      expect(acc.toOutput().response).toBe('a');
    });
  });

  describe('seed', () => {
    it('sets response before any deltas are applied', () => {
      const acc = new DeltaAccumulator();
      acc.seed({ response: 'prefix ' });
      acc.apply({ response: 'suffix' });
      expect(acc.toOutput().response).toBe('prefix suffix');
    });

    it('sets reasoning before any deltas are applied', () => {
      const acc = new DeltaAccumulator();
      acc.seed({ reasoning: 'initial reasoning ' });
      acc.apply({ reasoning: 'more reasoning' });
      expect(acc.toOutput().reasoning).toBe('initial reasoning more reasoning');
    });

    it('overwrites a previously seeded response', () => {
      const acc = new DeltaAccumulator();
      acc.seed({ response: 'first' });
      acc.seed({ response: 'second' });
      expect(acc.toOutput().response).toBe('second');
    });

    it('accepts an empty string response (clears it)', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'already accumulated' });
      acc.seed({ response: '' });
      expect(acc.toOutput().response).toBe('');
    });

    it('ignores undefined fields (does not overwrite existing)', () => {
      const acc = new DeltaAccumulator();
      acc.apply({ response: 'hello' });
      acc.seed({ reasoning: 'thought' });
      expect(acc.toOutput().response).toBe('hello');
      expect(acc.toOutput().reasoning).toBe('thought');
    });

    it('does not seed tool_calls (only response and reasoning)', () => {
      const acc = new DeltaAccumulator();
      acc.seed({ response: 'x' });
      expect(acc.toOutput().tool_calls).toBeUndefined();
    });
  });

  describe('toOutput', () => {
    it('returns empty response string when nothing applied', () => {
      const acc = new DeltaAccumulator();
      expect(acc.toOutput()).toEqual({ response: '' });
    });

    it('includes tool_calls sorted by index', () => {
      const acc = new DeltaAccumulator();
      acc.apply({
        tool_calls: [{ index: 1, id: 'b', type: 'function', function: { name: 'fn_b', arguments: '{"x":2}' } }],
      });
      acc.apply({
        tool_calls: [{ index: 0, id: 'a', type: 'function', function: { name: 'fn_a', arguments: '{"x":1}' } }],
      });
      const output = acc.toOutput();
      expect(output.tool_calls).toHaveLength(2);
      expect(output.tool_calls![0].id).toBe('a');
      expect(output.tool_calls![1].id).toBe('b');
    });

    it('leaves args empty when tool call arguments are not yet valid JSON', () => {
      const acc = new DeltaAccumulator();
      acc.apply({
        tool_calls: [{ index: 0, id: 'c', type: 'function', function: { name: 'fn', arguments: '{"x":' } }],
      });
      const output = acc.toOutput();
      expect(output.tool_calls![0].function.arguments).toEqual({});
    });
  });
});
