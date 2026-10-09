import { INF_TARGET_HEADER } from './index';
import { createHandler } from './hono';

type MockHonoContext = {
  req: {
    method: string;
    url: string;
    raw: { headers: Headers };
    header: (name: string) => string | undefined;
    text: () => Promise<string>;
  };
};

function createMockContext(overrides: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  url?: string;
} = {}): MockHonoContext {
  const headers = new Headers(overrides.headers ?? {});
  const url = overrides.url ?? 'http://localhost/api/inference/proxy';

  return {
    req: {
      method: overrides.method ?? 'POST',
      url,
      raw: { headers },
      header: (name) => headers.get(name) ?? undefined,
      text: () => Promise.resolve(overrides.body ?? '{"input":{}}'),
    },
  };
}

describe('hono createHandler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INFERENCE_API_KEY = 'hono-test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return 400 when target URL is missing', async () => {
    const handler = createHandler();
    const response = await handler(createMockContext() as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
    });
  });

  it('should proxy JSON responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const handler = createHandler();
    const target = 'https://api.inference.sh/apps/run';
    const response = await handler(
      createMockContext({
        headers: { [INF_TARGET_HEADER]: target },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer hono-test-key',
        }),
      })
    );
  });

  it('should passthrough SSE streaming responses', async () => {
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
    const response = await handler(
      createMockContext({
        headers: { [INF_TARGET_HEADER]: target },
      }) as never
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(await response.text()).toContain('data:');
  });

  it('should resolve API key via resolveApiKey option', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const handler = createHandler({
      resolveApiKey: async () => 'custom-hono-key',
    });
    const target = 'https://api.inference.sh/apps/run';
    await handler(
      createMockContext({
        headers: { [INF_TARGET_HEADER]: target },
      }) as never
    );

    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer custom-hono-key',
        }),
      })
    );
  });

  it('passes the proxy options to the core: isAuthenticated gets the Context, the endpoint list applies', async () => {
    global.fetch = jest.fn() as typeof fetch;
    const isAuthenticated = jest.fn().mockResolvedValue(false);
    const ctx = createMockContext({ headers: { [INF_TARGET_HEADER]: 'https://api.inference.sh/apps/run' } });
    expect((await createHandler({ isAuthenticated })(ctx as never)).status).toBe(401);
    expect(isAuthenticated).toHaveBeenCalledWith(ctx);

    const secrets = createMockContext({ method: 'GET', headers: { [INF_TARGET_HEADER]: 'https://api.inference.sh/secrets' } });
    expect((await createHandler()(secrets as never)).status).toBe(403);
    const other = createMockContext({ headers: { [INF_TARGET_HEADER]: 'https://api.inference.sh/apps/run' }, body: '{"app":"eve/x"}' });
    expect((await createHandler({ allowedEndpoints: ['ana/*'] })(other as never)).status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
