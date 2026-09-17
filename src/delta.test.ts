import { createLLMDeltaAccumulator } from './delta';

describe('LLM delta accumulator', () => {
  it('concatenates response tokens', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'Hello' });
    acc.apply({ response: ' world' });
    expect(acc.toOutput().response).toBe('Hello world');
  });

  // LLMDelta.Response is a plain Go string with no omitempty, so every delta
  // on the wire carries "response": "" — including a turn that is only tool
  // calls. Concatenating "" is a no-op, so without a reset the accumulator
  // keeps serving the PREVIOUS message's text and a tool-call-only message
  // renders it as its own. No race needed; it happened every time.
  it('does not serve the previous text to a tool-call-only turn', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'Answer to the first question.' });

    acc.reset(); // what the message boundary does

    // Second turn: tool calls, no text. This is the exact wire shape.
    acc.apply({
      response: '',
      tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'search', arguments: '{"q"' } }],
    });
    acc.apply({ response: '', tool_calls: [{ index: 0, function: { arguments: ':"x"}' } }] });

    const out = acc.toOutput();
    expect(out.response).toBe('');
    expect(out.tool_calls[0].function.arguments).toBe('{"q":"x"}');
  });

  // Empty string is not null, so it reaches the concat and leaves the old value
  // standing. This is why omitempty on the server would not have fixed it
  // either: an absent key takes the `incoming == null` path to the same place.
  it('is the empty string, not a missing key, that preserves stale text', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'stale' });
    acc.apply({ response: '' });
    expect(acc.toOutput().response).toBe('stale');
    acc.apply({});
    expect(acc.toOutput().response).toBe('stale');
  });

  // Tool-call index is scoped to one turn. Without a reset, index 0 of the
  // second message merges into index 0 left over from the first — arguments
  // concatenate across two unrelated calls.
  it('does not merge a later turn tool call into the earlier turn slot', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({
      tool_calls: [{ index: 0, id: 'call_first', type: 'function', function: { name: 'alpha', arguments: '{"a":1}' } }],
    });

    acc.reset();

    acc.apply({
      tool_calls: [{ index: 0, id: 'call_second', type: 'function', function: { name: 'beta', arguments: '{"b":2}' } }],
    });

    const calls = acc.toOutput().tool_calls;
    expect(calls).toHaveLength(1);
    expect(calls[0].id).toBe('call_second');
    expect(calls[0].function.arguments).toBe('{"b":2}');
  });

  it('reset clears everything, unlike seed which only sets non-null', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'text', tool_calls: [{ index: 0, function: { arguments: '{}' } }] });
    acc.seed({ response: undefined });
    expect(acc.toOutput().response).toBe('text');
    acc.reset();
    expect(acc.toOutput()).toEqual({});
  });
});
