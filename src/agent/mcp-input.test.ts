import {
  buildMCPInputResult,
  elicitParams,
  isURLElicitation,
  parseMCPInputState,
} from './mcp-input.js';

const state = {
  input_required: true,
  input_requests: {
    login: { method: 'elicitation/create', params: { mode: 'url', message: 'sign in', url: 'https://example.com/auth' } },
  },
  request_state: 'opaque',
  round: 2,
};

describe('parseMCPInputState', () => {
  it('parses an object', () => {
    expect(parseMCPInputState(state)).toEqual(state);
  });

  it('parses a JSON string', () => {
    expect(parseMCPInputState(JSON.stringify(state))).toEqual(state);
  });

  it('defaults round to 1', () => {
    expect(parseMCPInputState({ ...state, round: undefined })?.round).toBe(1);
  });

  it('preserves request_state from the runtime payload', () => {
    expect(parseMCPInputState(state)?.request_state).toBe('opaque');
    expect(parseMCPInputState({ ...state, request_state: undefined })?.request_state).toBeUndefined();
  });

  it('rejects data that is not a pending MCP input', () => {
    expect(parseMCPInputState(undefined)).toBeNull();
    expect(parseMCPInputState('not json')).toBeNull();
    expect(parseMCPInputState({ requirement_errors: [] })).toBeNull();
    expect(parseMCPInputState({ ...state, input_required: false })).toBeNull();
    expect(parseMCPInputState({ ...state, input_requests: {} })).toBeNull();
  });
});

describe('elicitParams', () => {
  it('returns params for elicitation/create', () => {
    expect(elicitParams(state.input_requests.login)?.url).toBe('https://example.com/auth');
  });

  it('defaults message to an empty string when omitted', () => {
    expect(
      elicitParams({ method: 'elicitation/create', params: { mode: 'form' } })?.message
    ).toBe('');
  });

  it('returns null for other methods', () => {
    expect(elicitParams({ method: 'sampling/createMessage', params: {} })).toBeNull();
  });

  it('preserves multi-select requestedSchema (array items anyOf/enum)', () => {
    const requestedSchema = {
      type: 'object' as const,
      properties: {
        tags: {
          type: 'array' as const,
          items: {
            type: 'string' as const,
            anyOf: [
              { const: 'a', title: 'Alpha' },
              { const: 'b', title: 'Beta', description: 'second' },
            ],
          },
          minItems: 1,
          maxItems: 3,
        },
        colors: {
          type: 'array' as const,
          items: { type: 'string' as const, enum: ['red', 'blue'] },
        },
      },
      required: ['tags'],
    };
    expect(
      elicitParams({
        method: 'elicitation/create',
        params: { mode: 'form', message: 'pick', requestedSchema },
      })?.requestedSchema,
    ).toEqual(requestedSchema);
  });
});

describe('isURLElicitation', () => {
  it('uses mode, then falls back to the presence of url', () => {
    expect(isURLElicitation({ mode: 'url', message: '' })).toBe(true);
    expect(isURLElicitation({ message: '', url: 'https://x.test' })).toBe(true);
    expect(isURLElicitation({ mode: 'form', message: '', url: 'https://x.test' })).toBe(false);
    expect(isURLElicitation({ message: '' })).toBe(false);
  });
});

describe('buildMCPInputResult', () => {
  it('keeps content only for accepted responses', () => {
    const result = buildMCPInputResult({
      a: { action: 'accept', content: { x: 1 } },
      b: { action: 'decline', content: { x: 2 } },
      c: { action: 'accept' },
    });
    expect(JSON.parse(result)).toEqual({
      a: { action: 'accept', content: { x: 1 } },
      b: { action: 'decline' },
      c: { action: 'accept' },
    });
  });
});
