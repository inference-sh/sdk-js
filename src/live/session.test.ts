import { LiveSession, accessUrl, type LiveEnd, type LiveState, type TaskWatch, type WebSocketLike } from './session';

/** A WebSocket the test drives: every dial is recorded, and the test opens, feeds and closes it. */
class FakeWebSocket implements WebSocketLike {
  static dialed: FakeWebSocket[] = [];
  binaryType = 'blob';
  readyState = 0;
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  sent: unknown[] = [];
  closedWith: { code?: number; reason?: string } | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.dialed.push(this);
  }

  send(data: string | ArrayBuffer | ArrayBufferView): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closedWith = { code, reason };
    // The runtime reports the close asynchronously, after the caller's turn.
    setTimeout(() => this.serverClose(code ?? 1005, reason ?? ''), 0);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  message(data: unknown): void {
    this.onmessage?.({ data });
  }

  serverClose(code: number, reason = ''): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}

const access = (n = 1) => ({ id: 'sock-1', url: 'wss://relay.test/sockets/sock-1', token: `tok-${n}`, expires_at: '2030-01-01T00:00:00Z' });

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function start(options: Partial<ConstructorParameters<typeof LiveSession>[0]> = {}) {
  const states: Array<{ state: LiveState; end?: LiveEnd }> = [];
  const patches: Record<string, unknown>[] = [];
  const binaries: ArrayBuffer[] = [];
  const session = new LiveSession({
    access: access(),
    handlers: {
      onState: (state, end) => states.push({ state, end }),
      onPatch: (patch) => patches.push(patch),
      onBinary: (data) => binaries.push(data),
    },
    webSocket: FakeWebSocket,
    ...options,
  });
  session.connect();
  return { session, states, patches, binaries, ws: () => FakeWebSocket.dialed[FakeWebSocket.dialed.length - 1] };
}

beforeEach(() => {
  FakeWebSocket.dialed = [];
});

describe('LiveSession', () => {
  it('puts the credential in the query and goes waiting, then live on the first frame', () => {
    const { session, states, patches, binaries, ws } = start();
    expect(ws().url).toBe('wss://relay.test/sockets/sock-1?access_token=tok-1');
    expect(ws().binaryType).toBe('arraybuffer');
    expect(session.state).toBe('connecting');

    ws().open();
    expect(session.state).toBe('waiting');
    expect(session.isOpen).toBe(true);

    ws().message(JSON.stringify({ effect: 'robot' }));
    expect(session.state).toBe('live');
    expect(patches).toEqual([{ effect: 'robot' }]);

    const pcm = new ArrayBuffer(8);
    ws().message(pcm);
    expect(binaries).toEqual([pcm]);
    ws().message('not json');
    expect(patches[1]).toEqual({ text: 'not json' });
    expect(states.map((s) => s.state)).toEqual(['connecting', 'waiting', 'live']);
  });

  it('sends binary frames and JSON patches only while open', () => {
    const { session, ws } = start();
    session.sendPatch({ voice: 'eve' });
    expect(ws().sent).toEqual([]);
    ws().open();
    const frame = new Uint8Array([1, 2, 3]);
    session.sendBinary(frame);
    session.sendPatch({ voice: 'eve' });
    expect(ws().sent).toEqual([frame, '{"voice":"eve"}']);
  });

  it('dials again with a fresh credential when the relay drops it before the app came', async () => {
    const renew = jest.fn(async () => access(2));
    const { session, states, ws } = start({ renew });
    ws().open();
    ws().serverClose(1012, 'restarting');
    await tick();
    expect(renew).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.dialed).toHaveLength(2);
    expect(ws().url).toContain('access_token=tok-2');
    expect(session.state).toBe('connecting');

    ws().open();
    ws().message('{}');
    expect(session.state).toBe('live');
    expect(states.filter((s) => s.state === 'ended')).toEqual([]);
  });

  it('does not dial again once frames have flowed', async () => {
    const { session, states, ws } = start({ renew: jest.fn() });
    ws().open();
    ws().message('{}');
    ws().serverClose(1012, 'restarting');
    await tick();
    expect(FakeWebSocket.dialed).toHaveLength(1);
    expect(session.state).toBe('ended');
    expect(states[states.length - 1]?.end).toEqual({ code: 1012, reason: 'restarting', byCaller: false, taskEnded: false });
    await expect(session.ended).resolves.toMatchObject({ code: 1012 });
  });

  it('gives up after five redials', async () => {
    const { session } = start({ renew: async () => access() });
    for (let i = 0; i < 6; i++) {
      FakeWebSocket.dialed[i].open();
      FakeWebSocket.dialed[i].serverClose(1013, 'peer did not come');
      await tick();
    }
    expect(FakeWebSocket.dialed).toHaveLength(6);
    expect(session.state).toBe('ended');
  });

  it('ends when the caller closes, and reports it as such', async () => {
    const { session, states, ws } = start();
    ws().open();
    session.close();
    expect(ws().closedWith).toEqual({ code: 1000, reason: 'done' });
    await tick();
    expect(session.state).toBe('ended');
    expect(states[states.length - 1]?.end).toMatchObject({ byCaller: true, code: 1000 });
  });

  it('ends without a redial when the caller closes before the socket opened', async () => {
    const { session, ws } = start({ renew: jest.fn() });
    session.close();
    ws().serverClose(1006, '');
    await tick();
    expect(session.state).toBe('ended');
    expect(FakeWebSocket.dialed).toHaveLength(1);
  });

  it('gives up waiting when the task fails before the app connected', async () => {
    let fail!: (err: Error) => void;
    const watch: TaskWatch = { done: new Promise((_, reject) => (fail = reject)), stop: jest.fn() };
    const { session, states, ws } = start({ task: watch });
    ws().open();
    fail(new Error('function "stream" failed: no module named x'));
    await tick();
    expect(session.state).toBe('ended');
    expect(states[states.length - 1]?.end).toEqual({ code: 1000, reason: 'function "stream" failed: no module named x', byCaller: false, taskEnded: true });
    expect(ws().closedWith).toEqual({ code: 1000, reason: 'task ended' });
    expect(watch.stop).toHaveBeenCalled();
    // The socket's own close report must not end the session a second time.
    await tick();
    expect(states.filter((s) => s.state === 'ended')).toHaveLength(1);
  });

  it('stops following the task once the app is there', async () => {
    let complete!: (task: unknown) => void;
    const watch: TaskWatch = { done: new Promise((resolve) => (complete = resolve)), stop: jest.fn() };
    const { session, ws } = start({ task: watch });
    ws().open();
    ws().message('{}');
    expect(watch.stop).toHaveBeenCalledTimes(1);
    complete({});
    await tick();
    expect(session.state).toBe('live');
  });

  it('needs a WebSocket', () => {
    const saved = (globalThis as { WebSocket?: unknown }).WebSocket;
    delete (globalThis as { WebSocket?: unknown }).WebSocket;
    try {
      expect(() => new LiveSession({ access: access() })).toThrow(/no WebSocket/);
    } finally {
      if (saved) (globalThis as { WebSocket?: unknown }).WebSocket = saved;
    }
  });
});

describe('the clear control frame', () => {
  it('goes to onClear, and the rest of the patch to onPatch', () => {
    const cleared: string[] = [];
    const patches: Record<string, unknown>[] = [];
    const session = new LiveSession({
      access: access(),
      handlers: { onClear: (field) => cleared.push(field), onPatch: (patch) => patches.push(patch) },
      webSocket: FakeWebSocket,
    });
    session.connect();
    const ws = FakeWebSocket.dialed[0];
    ws.open();
    ws.message(JSON.stringify({ $clear: 'audio' }));
    ws.message(JSON.stringify({ $clear: 'audio', assistant_text: '' }));

    expect(cleared).toEqual(['audio', 'audio']);
    expect(patches).toEqual([{ assistant_text: '' }]);
  });

  it('is an ordinary patch to a caller without onClear', () => {
    const { ws, patches } = start();
    ws().open();
    ws().message(JSON.stringify({ $clear: 'audio' }));

    expect(patches).toEqual([{ $clear: 'audio' }]);
  });
});

describe('accessUrl', () => {
  it('puts the credential in the query, after any query the relay url already has', () => {
    expect(accessUrl({ url: 'wss://relay.test/sockets/s1', token: 'a b' })).toBe('wss://relay.test/sockets/s1?access_token=a%20b');
    expect(accessUrl({ url: 'wss://relay.test/sockets/s1?region=eu', token: 't' })).toBe('wss://relay.test/sockets/s1?region=eu&access_token=t');
  });
});
