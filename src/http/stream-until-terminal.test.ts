import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
 * Shared helper for tasks.watchStream and AgentsAPI stream-until-idle (J8).
 * Integration tests cover task/chat reconcile; these pin the helper contract.
 */
describe('streamUntilTerminal', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('resolves when onData settles the wait', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockNdjsonResponse([`${JSON.stringify({ status: 'done', id: 1 })}\n`])
    );

    const { done } = streamUntilTerminal<{ status: string }, { status: string }>((settle) => ({
      request: (init) => fetch('http://test/stream', init),
      onData: (data) => settle.resolve(data),
      reconcile: async () => {},
      closedMessage: 'closed early',
    }));

    await expect(done).resolves.toEqual({ status: 'done', id: 1 });
  });

  it('calls reconcile when the stream ends before the wait settles', async () => {
    const reconcile = jest.fn(async () => {});
    global.fetch = jest.fn().mockResolvedValue(
      mockNdjsonResponse([`${JSON.stringify({ status: 'running' })}\n`])
    );

    const { done } = streamUntilTerminal<{ status: string }, void>((settle) => ({
      request: (init) => fetch('http://test/stream', init),
      onData: () => {},
      reconcile: async () => {
        reconcile();
        settle.resolve();
      },
      closedMessage: 'stream ended early',
    }));

    await expect(done).resolves.toBeUndefined();
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it('rejects with closedMessage when reconcile does not settle', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockNdjsonResponse([`${JSON.stringify({ status: 'running' })}\n`])
    );

    const { done } = streamUntilTerminal<{ status: string }, void>(() => ({
      request: (init) => fetch('http://test/stream', init),
      onData: () => {},
      reconcile: async () => {},
      closedMessage: 'resource still not terminal',
    }));

    await expect(done).rejects.toThrow('resource still not terminal');
  });

  it('rejects with the stream error without calling reconcile', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('connection reset'));
    const reconcile = jest.fn(async () => {});

    const { done } = streamUntilTerminal<unknown, void>(() => ({
      request: (init) => fetch('http://test/stream', init),
      onData: () => {},
      reconcile,
      closedMessage: 'closed',
    }));

    await expect(done).rejects.toThrow('connection reset');
    expect(reconcile).not.toHaveBeenCalled();
  });

  it('leaves done pending and invokes onStopped when stop() ends an unsettled wait', async () => {
    global.fetch = jest.fn().mockImplementation((_url, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });
    const onStopped = jest.fn();

    const watch = streamUntilTerminal<unknown, void>(() => ({
      request: (init) => fetch('http://test/stream', init),
      onData: () => {},
      reconcile: async () => {},
      closedMessage: 'closed',
      onStopped,
    }));

    await Promise.resolve();
    watch.stop();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const outcome = await Promise.race([
      watch.done.then(() => 'settled'),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 20)),
    ]);

    expect(outcome).toBe('pending');
    expect(onStopped).toHaveBeenCalledTimes(1);
  });

  it('ignores duplicate settle.resolve calls', async () => {
    global.fetch = jest.fn().mockResolvedValue(mockNdjsonResponse([]));

    let settleRef!: { resolve(value: number): void; reject(error: Error): void };
    const { done } = streamUntilTerminal<unknown, number>((settle) => {
      settleRef = settle;
      return {
        request: (init) => fetch('http://test/stream', init),
        onData: () => {},
        reconcile: async () => {},
        closedMessage: 'closed',
      };
    });

    await Promise.resolve();
    settleRef.resolve(7);
    settleRef.resolve(99);

    await expect(done).resolves.toBe(7);
  });

  it('tasks watchStream wires reconcile through observe (45909a4)', () => {
    const source = readFileSync(join(__dirname, '../api/tasks.ts'), 'utf8');
    expect(source).toMatch(/reconcile: async \(\) => observe\(\(await this\.get\(task\.id\)\)\.data\)/);
    expect(source).toMatch(/const observe = \(data: Task/);
  });
});
