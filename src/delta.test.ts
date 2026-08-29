import { DeltaAccumulator } from './delta';

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
