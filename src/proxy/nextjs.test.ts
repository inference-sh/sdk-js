import type { NextRequest } from 'next/server';
import { INF_TARGET_HEADER } from './index';
import { handlers, pageHandler } from './nextjs';

type MockPageResponse = {
  statusCode: number;
  headers: Record<string, string | number | string[]>;
  body: unknown;
  status: (code: number) => MockPageResponse;
  setHeader: (name: string, value: string) => void;
  json: (data: unknown) => MockPageResponse;
  send: (data: unknown) => MockPageResponse;
};

function createMockPageResponse(): MockPageResponse {
  const res: MockPageResponse = {
    statusCode: 200,
    headers: {},
    body: undefined,
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
  };
  return res;
}

function createMockNextRequest(overrides: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
} = {}): NextRequest {
  const url = overrides.url ?? 'http://localhost/api/inference/proxy';
  const headers = new Headers(overrides.headers ?? {});
  return {
    method: overrides.method ?? 'POST',
    url,
    text: async () => overrides.body ?? '',
    headers,
  } as unknown as NextRequest;
}

describe('nextjs pageHandler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INFERENCE_API_KEY = 'next-pages-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return 400 when target URL is missing', async () => {
    const req = { method: 'POST', body: {}, headers: {}, query: {} };
    const res = createMockPageResponse();

    await pageHandler(req as never, res as never);

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

    const target = 'https://api.inference.sh/v1/run';
    const req = {
      method: 'POST',
      body: { prompt: 'hi' },
      headers: { [INF_TARGET_HEADER]: target },
      query: {},
    };
    const res = createMockPageResponse();

    await pageHandler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('should proxy non-JSON responses through res.send()', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('plain-text', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    ) as typeof fetch;

    const target = 'https://api.inference.sh/v1/run';
    const req = {
      method: 'POST',
      body: {},
      headers: { [INF_TARGET_HEADER]: target },
      query: {},
    };
    const res = createMockPageResponse();

    await pageHandler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('plain-text');
  });
});

describe('nextjs App Router handlers', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INFERENCE_API_KEY = 'next-app-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return 400 when target URL is missing', async () => {
    const response = await handlers.POST(createMockNextRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
    });
  });

  it('should passthrough streaming upstream responses', async () => {
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

    const target = 'https://api.inference.sh/v1/stream';
    const response = await handlers.POST(
      createMockNextRequest({
        headers: { [INF_TARGET_HEADER]: target },
      })
    );

    expect(response.status).toBe(200);
    expect(response.body).not.toBeNull();
    const text = await new Response(response.body).text();
    expect(text).toContain('data:');
  });
});
