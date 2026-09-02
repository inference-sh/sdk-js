import {
  DeltaAccumulator,
  createLLMDeltaAccumulator,
  type FieldTags,
  type FieldTagsRegistry,
} from './delta';
import {
  MergeStrategyConcat,
  MergeStrategyReplace,
  MergeStrategyIndexed,
  MergeStrategyNested,
} from './types';

const concatTags: FieldTags = { text: { merge: MergeStrategyConcat } };
const replaceTags: FieldTags = { value: { merge: MergeStrategyReplace } };

describe('DeltaAccumulator', () => {
  describe('apply() — concat strategy', () => {
    it('appends string fragments', () => {
      const acc = new DeltaAccumulator(concatTags);
      acc.apply({ text: 'hello' });
      acc.apply({ text: ' world' });
      expect(acc.toOutput()).toEqual({ text: 'hello world' });
    });

    it('starts from empty string when no prior value', () => {
      const acc = new DeltaAccumulator(concatTags);
      acc.apply({ text: 'first' });
      expect(acc.toOutput().text).toBe('first');
    });
  });

  describe('apply() — replace strategy', () => {
    it('overwrites with the latest value', () => {
      const acc = new DeltaAccumulator(replaceTags);
      acc.apply({ value: 'a' });
      acc.apply({ value: 'b' });
      expect(acc.toOutput()).toEqual({ value: 'b' });
    });

    it('unknown fields default to replace', () => {
      const acc = new DeltaAccumulator({});
      acc.apply({ unknown: 'first' });
      acc.apply({ unknown: 'second' });
      expect(acc.toOutput()).toEqual({ unknown: 'second' });
    });
  });

  describe('apply() — null/undefined values are skipped', () => {
    it('does not overwrite existing value with null', () => {
      const acc = new DeltaAccumulator(replaceTags);
      acc.apply({ value: 'kept' });
      acc.apply({ value: null });
      expect(acc.toOutput()).toEqual({ value: 'kept' });
    });

    it('does not set a field when the incoming value is undefined', () => {
      const acc = new DeltaAccumulator(replaceTags);
      acc.apply({ value: undefined });
      expect(acc.toOutput()).toEqual({});
    });
  });

  describe('seed()', () => {
    it('initialises state without merge logic', () => {
      const acc = new DeltaAccumulator(concatTags);
      acc.seed({ text: 'seeded' });
      acc.apply({ text: ' more' });
      expect(acc.toOutput()).toEqual({ text: 'seeded more' });
    });

    it('skips null values during seed', () => {
      const acc = new DeltaAccumulator(replaceTags);
      acc.seed({ value: null });
      expect(acc.toOutput()).toEqual({});
    });
  });

  describe('toOutput()', () => {
    it('returns a shallow copy — mutations do not affect internal state', () => {
      const acc = new DeltaAccumulator(replaceTags);
      acc.apply({ value: 'original' });
      const out = acc.toOutput();
      out.value = 'mutated';
      expect(acc.toOutput()).toEqual({ value: 'original' });
    });
  });

  describe('apply() — indexed strategy', () => {
    const itemTags: FieldTags = { name: { merge: MergeStrategyConcat } };
    const parentTags: FieldTags = { items: { merge: MergeStrategyIndexed } };
    const registry: FieldTagsRegistry = new Map([[parentTags, itemTags]]);

    it('inserts a new item by index', () => {
      const acc = new DeltaAccumulator(parentTags, registry);
      acc.apply({ items: [{ index: 0, name: 'a' }] });
      expect(acc.toOutput().items).toEqual([{ index: 0, name: 'a' }]);
    });

    it('merges subsequent deltas into the same index', () => {
      const acc = new DeltaAccumulator(parentTags, registry);
      acc.apply({ items: [{ index: 0, name: 'hel' }] });
      acc.apply({ items: [{ index: 0, name: 'lo' }] });
      expect(acc.toOutput().items).toEqual([{ index: 0, name: 'hello' }]);
    });

    it('maintains items sorted by index', () => {
      const acc = new DeltaAccumulator(parentTags, registry);
      acc.apply({ items: [{ index: 1, name: 'b' }] });
      acc.apply({ items: [{ index: 0, name: 'a' }] });
      expect(acc.toOutput().items.map((i: any) => i.index)).toEqual([0, 1]);
    });

    it('handles multiple items in a single delta', () => {
      const acc = new DeltaAccumulator(parentTags, registry);
      acc.apply({ items: [{ index: 0, name: 'x' }, { index: 1, name: 'y' }] });
      expect(acc.toOutput().items).toHaveLength(2);
    });
  });

  describe('apply() — nested strategy', () => {
    const innerTags: FieldTags = { content: { merge: MergeStrategyConcat } };
    const parentTags: FieldTags = { payload: { merge: MergeStrategyNested } };
    const registry: FieldTagsRegistry = new Map([[parentTags, innerTags]]);

    it('creates the nested object on first delta', () => {
      const acc = new DeltaAccumulator(parentTags, registry);
      acc.apply({ payload: { content: 'hello' } });
      expect(acc.toOutput()).toEqual({ payload: { content: 'hello' } });
    });

    it('merges into an existing nested object', () => {
      const acc = new DeltaAccumulator(parentTags, registry);
      acc.apply({ payload: { content: 'hel' } });
      acc.apply({ payload: { content: 'lo' } });
      expect(acc.toOutput()).toEqual({ payload: { content: 'hello' } });
    });
  });
});

describe('createLLMDeltaAccumulator', () => {
  it('concatenates response fragments', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'Hello' });
    acc.apply({ response: ', world' });
    expect(acc.toOutput().response).toBe('Hello, world');
  });

  it('replaces usage with the latest value', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ usage: { prompt_tokens: 5, completion_tokens: 2 } });
    acc.apply({ usage: { prompt_tokens: 5, completion_tokens: 10 } });
    expect(acc.toOutput().usage).toEqual({ prompt_tokens: 5, completion_tokens: 10 });
  });

  it('accumulates tool_calls across deltas', () => {
    const acc = createLLMDeltaAccumulator();
    // First delta: opens the tool call with name
    acc.apply({ tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'my_func', arguments: '' } }] });
    // Subsequent deltas: stream argument fragments
    acc.apply({ tool_calls: [{ index: 0, function: { arguments: '{"key"' } }] });
    acc.apply({ tool_calls: [{ index: 0, function: { arguments: ': "value"}' } }] });

    const toolCalls = acc.toOutput().tool_calls;
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].id).toBe('call_1');
    expect(toolCalls[0].function.name).toBe('my_func');
    expect(toolCalls[0].function.arguments).toBe('{"key": "value"}');
  });

  it('handles multiple simultaneous tool calls by index', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ tool_calls: [{ index: 0, id: 'call_0', function: { name: 'func_a', arguments: 'arg_a' } }] });
    acc.apply({ tool_calls: [{ index: 1, id: 'call_1', function: { name: 'func_b', arguments: 'arg_b' } }] });

    const toolCalls = acc.toOutput().tool_calls;
    expect(toolCalls).toHaveLength(2);
    expect(toolCalls[0].function.name).toBe('func_a');
    expect(toolCalls[1].function.name).toBe('func_b');
  });

  it('null delta fields are ignored', () => {
    const acc = createLLMDeltaAccumulator();
    acc.apply({ response: 'hello', tool_calls: null });
    expect(acc.toOutput()).toEqual({ response: 'hello' });
  });
});
