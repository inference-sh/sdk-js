import {
  elicitParams,
  isURLElicitation,
  parseMCPInputState,
} from './mcp-input.js';

/**
 * Complements src/agent/mcp-input.test.ts for 475c1e6 (aikido 796582714): UI code
 * must call elicitParams on each InputRequest — parseMCPInputState does not sanitize.
 */
describe('MCP elicitation sanitization contract (475c1e6)', () => {
  const maliciousRequest = {
    method: 'elicitation/create' as const,
    params: {
      message: { not: 'a string' },
      url: 42,
      requestedSchema: {
        properties: {
          pick: {
            type: 'string',
            enum: [1, 'ok', null],
            oneOf: [{ const: 'a' }, { title: 'no const' }, 'bad'],
            items: 'nope',
          },
          tags: {
            type: 'array',
            items: { enum: ['good', 9, false], anyOf: [null, { const: 'x', title: 'X' }] },
          },
        },
        required: [0, 'pick', null],
      },
    },
  };

  it('parseMCPInputState keeps server input_requests raw; elicitParams yields a safe shape', () => {
    const parsed = parseMCPInputState({
      input_required: true,
      input_requests: { step: maliciousRequest },
    });
    expect(parsed?.input_requests.step.params).toEqual(maliciousRequest.params);

    const safe = elicitParams(parsed!.input_requests.step);
    expect(safe?.message).toBe('');
    expect(safe && 'url' in safe).toBe(false);
    expect(safe?.requestedSchema).toEqual({
      properties: {
        pick: { type: 'string', enum: ['ok'], oneOf: [{ const: 'a' }] },
        tags: { type: 'array', items: { enum: ['good'], anyOf: [{ const: 'x', title: 'X' }] } },
      },
      required: ['pick'],
    });

    const required = safe!.requestedSchema!.required ?? [];
    const properties = safe!.requestedSchema!.properties ?? {};
    for (const name of required) {
      expect(typeof name).toBe('string');
      expect(name in properties).toBe(true);
    }
    for (const prop of Object.values(properties)) {
      prop.enum?.forEach((v) => expect(typeof v).toBe('string'));
      prop.oneOf?.forEach((c) => expect(typeof c.const).toBe('string'));
      prop.items?.enum?.forEach((v) => expect(typeof v).toBe('string'));
      prop.items?.anyOf?.forEach((c) => expect(typeof c.const).toBe('string'));
    }
  });

  it('returns null when elicitation/create params are null or undefined', () => {
    expect(elicitParams({ method: 'elicitation/create', params: null as never })).toBeNull();
    expect(elicitParams({ method: 'elicitation/create', params: undefined as never })).toBeNull();
  });

  it('isURLElicitation uses dropped non-string url only when mode is url', () => {
    const params = elicitParams({
      method: 'elicitation/create',
      params: { message: 'sign in', url: 99 } as never,
    });
    expect(params).toEqual({ message: 'sign in' });
    expect(isURLElicitation(params!)).toBe(false);

    const urlMode = elicitParams({
      method: 'elicitation/create',
      params: { mode: 'url', message: 'sign in', url: 99 } as never,
    });
    expect(urlMode).toEqual({ mode: 'url', message: 'sign in' });
    expect(isURLElicitation(urlMode!)).toBe(true);
  });
});
