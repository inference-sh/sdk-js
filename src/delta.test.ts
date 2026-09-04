import { DeltaAccumulator } from './delta';
import { ToolTypeFunction } from './types';

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
