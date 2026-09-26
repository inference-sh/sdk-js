import { CLEAR_KEY, ERROR_KEY, REDIAL_CODES, STREAM_FORMAT } from './protocol';

describe('live protocol wire constants', () => {
  it('exports the stream format and reserved control keys', () => {
    expect(STREAM_FORMAT).toBe('stream');
    expect(CLEAR_KEY).toBe('$clear');
    expect(ERROR_KEY).toBe('$error');
    expect(CLEAR_KEY.startsWith('$')).toBe(true);
    expect(ERROR_KEY.startsWith('$')).toBe(true);
  });

  it('REDIAL_CODES matches relay restart / peer-timeout close codes', () => {
    expect(REDIAL_CODES.has(1012)).toBe(true);
    expect(REDIAL_CODES.has(1013)).toBe(true);
    expect(REDIAL_CODES.has(1000)).toBe(false);
  });
});
