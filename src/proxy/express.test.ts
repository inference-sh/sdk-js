import { INF_TARGET_HEADER } from './index';
import { createHandler } from './express';

type MockResponse = {
  statusCode: number;
  headers: Record<string, string | number | string[]>;
  body: unknown;
  chunks: Uint8Array[];
  status: (code: number) => MockResponse;
  setHeader: (name: string, value: string) => void;
  json: (data: unknown) => MockResponse;
  send: (data: unknown) => MockResponse;
  write: (chunk: Uint8Array) => void;
  end: () => void;
  on: (event: string, listener: () => void) => MockResponse;
};

function createMockResponse(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
    chunks: [],
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
    send(data: unknown) {
      this.body = data;
      return this;
    },
    write(chunk: Uint8Array) {
      this.chunks.push(chunk);
    },
    end() {
      return;
    },
    on() {
      return this;
    },
  };
  return res;
}

describe('express createHandler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INFERENCE_API_KEY = 'express-test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return 400 when target URL is missing', async () => {
    const handler = createHandler();
    const req = {
      method: 'POST',
      body: {},
      headers: {},
      query: {},
    };
    const res = createMockResponse();

    await handler(req as never, res as never, jest.fn());

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
    });
  });

  it('should proxy JSON responses through res.json()', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const handler = createHandler();
    const target = 'https://api.inference.sh/apps/run';
    const req = {
      method: 'POST',
      body: { input: { prompt: 'hi' } },
      headers: { [INF_TARGET_HEADER]: target },
      query: {},
    };
    const res = createMockResponse();

    await handler(req as never, res as never, jest.fn());

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer express-test-key',
        }),
      })
    );
  });

  it('should stream SSE responses with res.write()', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"x":1}\n\n'));
        controller.close();
      },
    });

    global.fetch = jest.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      })
    ) as typeof fetch;

    const handler = createHandler();
    const target = 'https://api.inference.sh/agents/run';
    const req = {
      method: 'POST',
      body: {},
      headers: { [INF_TARGET_HEADER]: target },
      query: {},
    };
    const res = createMockResponse();

    await handler(req as never, res as never, jest.fn());

    expect(res.statusCode).toBe(200);
    expect(res.chunks.length).toBeGreaterThan(0);
    expect(res.body).toBeUndefined();
  });

  it('passes the proxy options to the core: isAuthenticated gets the request, the endpoint list applies', async () => {
    global.fetch = jest.fn() as typeof fetch;
    const isAuthenticated = jest.fn().mockResolvedValue(false);
    const req = { method: 'POST', body: { app: 'ana/x' }, headers: { [INF_TARGET_HEADER]: 'https://api.inference.sh/apps/run' }, query: {} };
    const res = createMockResponse();
    await createHandler({ isAuthenticated })(req as never, res as never, jest.fn());
    expect(res.statusCode).toBe(401);
    expect(isAuthenticated).toHaveBeenCalledWith(req);

    const refused = createMockResponse();
    await createHandler({ allowedEndpoints: ['bob/*'] })(req as never, refused as never, jest.fn());
    expect(refused.statusCode).toBe(403);
    const secrets = createMockResponse();
    await createHandler()({ ...req, method: 'GET', headers: { [INF_TARGET_HEADER]: 'https://api.inference.sh/secrets' } } as never, secrets as never, jest.fn());
    expect(secrets.statusCode).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
