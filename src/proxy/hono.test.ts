import { INF_TARGET_HEADER } from './index';
import { createHandler } from './hono';

type MockHonoContext = {
  req: {
    method: string;
    url: string;
    text: () => Promise<string>;
    header: (name: string) => string | undefined;
    raw: { headers: Headers };
  };
};

function createMockContext(overrides: Partial<MockHonoContext['req']> = {}): MockHonoContext {
  const headers = new Headers();
  const headerFn =
    overrides.header ??
    ((name: string) => headers.get(name) ?? undefined);

  return {
    req: {
      method: 'POST',
      url: 'http://localhost/api/inference/proxy',
      text: async () => '{"ok":true}',
      header: headerFn,
      raw: { headers: overrides.raw?.headers ?? headers },
      ...overrides,
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
    const context = createMockContext();

    const response = await handler(context as never);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: `Missing ${INF_TARGET_HEADER} header or __inf_target query param`,
    });
  });

  it('should proxy upstream JSON responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const target = 'https://api.inference.sh/v1/run';
    const headers = new Headers({ [INF_TARGET_HEADER]: target });
    const handler = createHandler();
    const context = createMockContext({
      raw: { headers },
      header: (name) => headers.get(name) ?? undefined,
    });

    const response = await handler(context as never);

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

  it('should swallow body read errors and still proxy', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;

    const target = 'https://api.inference.sh/v1/run';
    const headers = new Headers({ [INF_TARGET_HEADER]: target });
    const handler = createHandler();
    const context = createMockContext({
      raw: { headers },
      header: (name) => headers.get(name) ?? undefined,
      text: async () => {
        throw new Error('body unavailable');
      },
    });

    const response = await handler(context as never);

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalled();
  });
});
