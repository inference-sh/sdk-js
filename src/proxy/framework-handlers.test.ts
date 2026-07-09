import { INF_TARGET_HEADER } from './index';
import { createHandler as createHonoHandler } from './hono';
import { createHandler as createRemixHandler } from './remix';
import { createHandler as createSvelteHandler } from './svelte';
import { pageHandler, handlers } from './nextjs';

type MockNextResponse = {
  statusCode: number;
  headers: Record<string, string | number | string[]>;
  body: unknown;
  status: (code: number) => MockNextResponse;
  setHeader: (name: string, value: string) => void;
  json: (data: unknown) => MockNextResponse;
  send: (data: unknown) => MockNextResponse;
};

function createMockNextResponse(): MockNextResponse {
  const res: MockNextResponse = {
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

describe('proxy framework handlers', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INFERENCE_API_KEY = 'framework-test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockUpstreamJson() {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;
  }

  describe('hono createHandler', () => {
    it('should return 400 when target URL is missing', async () => {
      const handler = createHonoHandler();
      const response = await handler({
        req: {
          method: 'POST',
          url: 'http://localhost/api/proxy',
          text: async () => '{}',
          raw: { headers: new Headers() },
          header: () => undefined,
        },
      } as never);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
      });
    });

    it('should proxy requests with Authorization header', async () => {
      mockUpstreamJson();
      const target = 'https://api.inference.sh/v1/run';
      const handler = createHonoHandler();

      const response = await handler({
        req: {
          method: 'POST',
          url: 'http://localhost/api/proxy',
          text: async () => '{"prompt":"hi"}',
          raw: { headers: new Headers({ [INF_TARGET_HEADER]: target }) },
          header: (name: string) =>
            name === INF_TARGET_HEADER ? target : undefined,
        },
      } as never);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(global.fetch).toHaveBeenCalledWith(
        target,
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer framework-test-key',
          }),
        })
      );
    });

    it('should tolerate unreadable request bodies', async () => {
      mockUpstreamJson();
      const target = 'https://api.inference.sh/v1/run';
      const handler = createHonoHandler();

      await handler({
        req: {
          method: 'POST',
          url: 'http://localhost/api/proxy',
          text: async () => {
            throw new Error('body unavailable');
          },
          raw: { headers: new Headers({ [INF_TARGET_HEADER]: target }) },
          header: (name: string) =>
            name === INF_TARGET_HEADER ? target : undefined,
        },
      } as never);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('remix createHandler', () => {
    it('should return 400 when target URL is missing', async () => {
      const handler = createRemixHandler();
      const response = await handler({
        request: new Request('http://localhost/api/proxy', { method: 'POST' }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
      });
    });

    it('should proxy JSON responses', async () => {
      mockUpstreamJson();
      const target = 'https://api.inference.sh/v1/run';
      const handler = createRemixHandler();

      const response = await handler({
        request: new Request('http://localhost/api/proxy', {
          method: 'POST',
          headers: { [INF_TARGET_HEADER]: target },
          body: '{"prompt":"hi"}',
        }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });
  });

  describe('svelte createHandler', () => {
    it('should return 400 when target URL is missing', async () => {
      const handler = createSvelteHandler();
      const response = await handler({
        request: new Request('http://localhost/api/proxy', { method: 'POST' }),
      } as never);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
      });
    });

    it('should proxy JSON responses', async () => {
      mockUpstreamJson();
      const target = 'https://api.inference.sh/v1/run';
      const handler = createSvelteHandler();

      const response = await handler({
        request: new Request('http://localhost/api/proxy', {
          method: 'POST',
          headers: { [INF_TARGET_HEADER]: target },
          body: '{"prompt":"hi"}',
        }),
      } as never);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });
  });

  describe('nextjs pageHandler', () => {
    it('should return 400 when target URL is missing', async () => {
      const res = createMockNextResponse();

      await pageHandler(
        { method: 'POST', body: {}, headers: {}, query: {} } as never,
        res as never
      );

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
      });
    });

    it('should proxy JSON responses through res.json()', async () => {
      mockUpstreamJson();
      const target = 'https://api.inference.sh/v1/run';
      const res = createMockNextResponse();

      await pageHandler(
        {
          method: 'POST',
          body: { prompt: 'hi' },
          headers: { [INF_TARGET_HEADER]: target },
          query: {},
        } as never,
        res as never
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('should unwrap array query params to a single value', async () => {
      mockUpstreamJson();
      const target = 'https://api.inference.sh/v1/run';
      const res = createMockNextResponse();

      await pageHandler(
        {
          method: 'POST',
          body: {},
          headers: { [INF_TARGET_HEADER]: target },
          query: { __inf_target: [target, 'ignored'] },
        } as never,
        res as never
      );

      expect(res.statusCode).toBe(200);
    });
  });

  describe('nextjs app router handlers', () => {
    it('should return 400 when target URL is missing', async () => {
      const response = await handlers.POST(
        new Request('http://localhost/api/proxy', { method: 'POST' }) as never
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
      });
    });

    it('should proxy streaming responses with passthrough body', async () => {
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
        new Request('http://localhost/api/proxy', {
          method: 'POST',
          headers: { [INF_TARGET_HEADER]: target },
        }) as never
      );

      expect(response.status).toBe(200);
      expect(response.body).not.toBeNull();
    });
  });
});
