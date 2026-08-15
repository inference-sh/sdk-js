/**
 * Smoke test for the production eventsource dependency (bumped to 4.1.1 in #263).
 * HttpClient.createEventSource passes a custom fetch to EventSource — verify the
 * constructor accepts that option shape without mocking the package.
 */
import { EventSource } from 'eventsource';

describe('eventsource package compatibility', () => {
  it('exports EventSource constructor that accepts custom fetch option', () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/event-stream' }),
      body: null,
    });

    expect(() => {
      const source = new EventSource('https://example.com/stream', {
        fetch: mockFetch as unknown as typeof fetch,
      });
      source.close();
    }).not.toThrow();
  });
});
