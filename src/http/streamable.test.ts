/**
 * Unit tests for streamable HTTP client
 */

import { streamable, streamableRaw, StreamableManager, StreamableMessage } from './streamable';

// Mock fetch for unit tests
const mockFetch = (chunks: string[]) => {
  let chunkIndex = 0;

  const mockReader = {
    read: jest.fn().mockImplementation(async () => {
      if (chunkIndex >= chunks.length) {
        return { done: true, value: undefined };
      }
      const chunk = chunks[chunkIndex++];
      return { done: false, value: new TextEncoder().encode(chunk) };
    }),
    releaseLock: jest.fn(),
  };

  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: {
      getReader: () => mockReader,
    },
  });
};

describe('streamable', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should parse NDJSON lines', async () => {
    global.fetch = mockFetch([
      '{"id":1,"name":"first"}\n',
      '{"id":2,"name":"second"}\n',
    ]) as any;

    const results: any[] = [];
    for await (const item of streamable('http://test.com/stream')) {
      results.push(item);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ id: 1, name: 'first' });
    expect(results[1]).toEqual({ id: 2, name: 'second' });
  });

  it('should skip heartbeats by default', async () => {
    global.fetch = mockFetch([
      '{"id":1}\n',
      '{"type":"heartbeat"}\n',
      '{"id":2}\n',
    ]) as any;

    const results: any[] = [];
    for await (const item of streamable('http://test.com/stream')) {
      results.push(item);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ id: 1 });
    expect(results[1]).toEqual({ id: 2 });
  });

  it('should include heartbeats when skipHeartbeats is false', async () => {
    global.fetch = mockFetch([
      '{"id":1}\n',
      '{"type":"heartbeat"}\n',
      '{"id":2}\n',
    ]) as any;

    const results: any[] = [];
    for await (const item of streamable('http://test.com/stream', { skipHeartbeats: false })) {
      results.push(item);
    }

    expect(results).toHaveLength(3);
  });

  it('should unwrap data from wrapped messages', async () => {
    global.fetch = mockFetch([
      '{"data":{"id":1},"fields":["id"]}\n',
      '{"event":"update","data":{"id":2}}\n',
    ]) as any;

    const results: any[] = [];
    for await (const item of streamable('http://test.com/stream')) {
      results.push(item);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ id: 1 });
    expect(results[1]).toEqual({ id: 2 });
  });

  it('should handle chunked data across multiple reads', async () => {
    global.fetch = mockFetch([
      '{"id":1}\n{"id":',  // First chunk ends mid-JSON
      '2}\n',              // Second chunk completes it
    ]) as any;

    const results: any[] = [];
    for await (const item of streamable('http://test.com/stream')) {
      results.push(item);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ id: 1 });
    expect(results[1]).toEqual({ id: 2 });
  });

  it('should handle empty lines', async () => {
    global.fetch = mockFetch([
      '{"id":1}\n',
      '\n',
      '{"id":2}\n',
      '\n\n',
    ]) as any;

    const results: any[] = [];
    for await (const item of streamable('http://test.com/stream')) {
      results.push(item);
    }

    expect(results).toHaveLength(2);
  });

  it('should set correct headers', async () => {
    const mockFetchFn = mockFetch(['{"ok":true}\n']);
    global.fetch = mockFetchFn as any;

    const results: any[] = [];
    for await (const item of streamable('http://test.com/stream', {
      headers: { 'Authorization': 'Bearer token' },
    })) {
      results.push(item);
    }

    expect(mockFetchFn).toHaveBeenCalledWith('http://test.com/stream', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        'Accept': 'application/x-ndjson',
        'Authorization': 'Bearer token',
      }),
    }));
  });

  it('should use POST when body is provided', async () => {
    const mockFetchFn = mockFetch(['{"ok":true}\n']);
    global.fetch = mockFetchFn as any;

    const results: any[] = [];
    for await (const item of streamable('http://test.com/stream', {
      body: { query: 'test' },
    })) {
      results.push(item);
    }

    expect(mockFetchFn).toHaveBeenCalledWith('http://test.com/stream', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ query: 'test' }),
    }));
  });

  it('should throw on HTTP error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    }) as any;

    await expect(async () => {
      for await (const _ of streamable('http://test.com/stream')) {
        // consume
      }
    }).rejects.toThrow('HTTP 401: Unauthorized');
  });
});

describe('streamableRaw', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should preserve event and fields in raw mode', async () => {
    global.fetch = mockFetch([
      '{"event":"update","data":{"id":1},"fields":["id"]}\n',
    ]) as any;

    const results: any[] = [];
    for await (const item of streamableRaw('http://test.com/stream')) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      event: 'update',
      data: { id: 1 },
      fields: ['id'],
    });
  });
});

describe('StreamableManager', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should call onData for each message', async () => {
    global.fetch = mockFetch([
      '{"id":1}\n',
      '{"id":2}\n',
    ]) as any;

    const messages: any[] = [];
    const manager = new StreamableManager({
      url: 'http://test.com/stream',
      onData: (data) => messages.push(data),
    });

    await manager.start();

    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ id: 1 });
    expect(messages[1]).toEqual({ id: 2 });
  });

  it('should call onPartialData for partial updates', async () => {
    global.fetch = mockFetch([
      '{"data":{"id":1},"fields":["id"]}\n',
    ]) as any;

    const partials: Array<{ data: any; fields: string[] }> = [];
    const manager = new StreamableManager({
      url: 'http://test.com/stream',
      onPartialData: (data, fields) => partials.push({ data, fields }),
    });

    await manager.start();

    expect(partials).toHaveLength(1);
    expect(partials[0]).toEqual({ data: { id: 1 }, fields: ['id'] });
  });

  it('should call lifecycle callbacks', async () => {
    global.fetch = mockFetch(['{"ok":true}\n']) as any;

    const events: string[] = [];
    const manager = new StreamableManager({
      url: 'http://test.com/stream',
      onStart: () => events.push('start'),
      onEnd: () => events.push('end'),
      onData: () => events.push('data'),
    });

    await manager.start();

    expect(events).toEqual(['start', 'data', 'end']);
  });

  it('should handle stop()', async () => {
    let readCount = 0;
    const mockReader = {
      read: jest.fn().mockImplementation(async () => {
        readCount++;
        if (readCount > 10) {
          return { done: true, value: undefined };
        }
        await new Promise(resolve => setTimeout(resolve, 10));
        return { done: false, value: new TextEncoder().encode('{"id":1}\n') };
      }),
      releaseLock: jest.fn(),
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    }) as any;

    const manager = new StreamableManager({
      url: 'http://test.com/stream',
      onData: () => {},
    });

    // Start and immediately stop
    const startPromise = manager.start();
    setTimeout(() => manager.stop(), 25);

    await startPromise;

    // Should have stopped before reading all 10
    expect(readCount).toBeLessThan(10);
  });
});
