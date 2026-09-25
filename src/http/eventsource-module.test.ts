/**
 * Regression guard for eventsource >=5 (ESM-only): Jest must transform the
 * package via transformIgnorePatterns + ts-jest allowJs (see jest.config.cjs).
 */
import { EventSource } from 'eventsource';

describe('eventsource dependency (ESM under Jest)', () => {
  it('exposes the EventSource constructor after Jest transforms the ESM package', () => {
    expect(typeof EventSource).toBe('function');
    expect(EventSource.name).toBe('EventSource');
  });
});
