import { streamUntilTerminal } from './stream-until-terminal.js';

const originalFetch = global.fetch;

function mockNdjsonResponse(chunks: string[]) {
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'application/x-ndjson' },
  });
}

/**
 * v0.23.0: streamUntilTerminal enables StreamableManager reconnect by default and
 * refetches the resource on each reconnect via resync (before reading the new stream).
 */
describe('streamUntilTerminal reconnect (v0.23.0)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(1);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('runs resync after a reconnect and can settle before reading the new stream', async () => {
    const networkError = () => new TypeError('network error');
    const request = jest
      .fn()
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(mockNdjsonResponse([`${JSON.stringify({ status: 'done' })}\n`]));
    const resync = jest.fn(async () => {});

    const { done } = streamUntilTerminal<unknown, void>((settle) => ({
      request,
      onData: () => {},
      resync: async () => {
        resync();
        settle.resolve();
      },
      reconcile: async () => {},
      closedMessage: 'closed early',
      reconnect: { baseDelayMs: 100, maxDelayMs: 100, maxAttempts: 3, idleTimeoutMs: 0 },
    }));

    const finished = done;
    await jest.advanceTimersByTimeAsync(100);
    await finished;

    expect(request).toHaveBeenCalledTimes(2);
    expect(resync).toHaveBeenCalledTimes(1);
  });

  it('does not retry when reconnect is false', async () => {
    const request = jest.fn().mockRejectedValue(new Error('connection reset'));
    const resync = jest.fn(async () => {});

    const { done } = streamUntilTerminal<unknown, void>(() => ({
      request,
      onData: () => {},
      reconcile: async () => {},
      resync,
      closedMessage: 'closed',
      reconnect: false,
    }));

    await expect(done).rejects.toThrow('connection reset');
    expect(request).toHaveBeenCalledTimes(1);
    expect(resync).not.toHaveBeenCalled();
  });
});
