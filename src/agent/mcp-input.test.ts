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

  it('returns a well-formed requestedSchema as sent', () => {
    const params = {
      mode: 'form',
      message: 'pick',
      requestedSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Name', minLength: 1 },
          size: { type: 'string', enum: ['s', 'm'], enumNames: ['Small', 'Medium'] },
          color: { type: 'string', oneOf: [{ const: 'r', title: 'Red' }] },
          tags: { type: 'array', items: { type: 'string', anyOf: [{ const: 'a', title: 'A' }] }, minItems: 1 },
        },
        required: ['name'],
      },
    };
    expect(elicitParams({ method: 'elicitation/create', params })).toEqual(params);
  });

  it('returns null when params is not an object', () => {
    for (const params of ['text', 7, true, ['a']]) {
      expect(elicitParams({ method: 'elicitation/create', params: params as never })).toBeNull();
    }
  });

  it('drops a message or url that is not a string', () => {
    const got = elicitParams({ method: 'elicitation/create', params: { message: { a: 1 }, url: 5 } as never });
    expect(got).toEqual({ message: '' });
    expect(got && 'url' in got).toBe(false);
  });

  it('drops a requestedSchema that is not an object', () => {
    for (const requestedSchema of ['x', 3, null, ['a']]) {
      const got = elicitParams({ method: 'elicitation/create', params: { message: 'm', requestedSchema } as never });
      expect(got).toEqual({ message: 'm' });
    }
  });

  it('drops properties and required that do not have the declared shape', () => {
    const schemaOf = (requestedSchema: unknown) =>
      elicitParams({ method: 'elicitation/create', params: { message: 'm', requestedSchema } as never })?.requestedSchema;

    expect(schemaOf({ type: 'object', properties: 'nope', required: 'name' })).toEqual({ type: 'object' });
    expect(schemaOf({ properties: ['a'], required: [1, 'name', null] })).toEqual({ required: ['name'] });
    expect(schemaOf({ properties: { ok: { type: 'string' }, bad: 'string', nil: null, list: [] } })).toEqual({
      properties: { ok: { type: 'string' } },
    });
  });

  it('drops malformed choices of a property', () => {
    const got = elicitParams({
      method: 'elicitation/create',
      params: {
        message: 'm',
        requestedSchema: {
          properties: {
            a: { type: 'string', enum: 'x', enumNames: { 0: 'X' }, oneOf: 'y' },
            b: { type: 'string', enum: ['x', 2], oneOf: [{ const: 'r' }, 'bad', { title: 'no const' }] },
            c: { type: 'array', items: 'string' },
            d: { type: 'array', items: { enum: 5, anyOf: [null, { const: 'k' }] } },
          },
        },
      } as never,
    });
    expect(got?.requestedSchema?.properties).toEqual({
      a: { type: 'string' },
      b: { type: 'string', enum: ['x'], oneOf: [{ const: 'r' }] },
      c: { type: 'array' },
      d: { type: 'array', items: { anyOf: [{ const: 'k' }] } },
    });
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
