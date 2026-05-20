import type { RequestEvent } from '@sveltejs/kit';
import { INF_TARGET_HEADER } from './index';
import { createHandler } from './svelte';

function createMockEvent(request: Request): RequestEvent {
  return { request } as RequestEvent;
}

describe('svelte createHandler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INFERENCE_API_KEY = 'svelte-test-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('should return 400 when target URL is missing', async () => {
    const handler = createHandler();
    const request = new Request('http://localhost/api/inference/proxy', {
      method: 'POST',
    });

    const response = await handler(createMockEvent(request));

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
    const handler = createHandler();
    const request = new Request('http://localhost/api/inference/proxy', {
      method: 'POST',
      headers: { [INF_TARGET_HEADER]: target },
      body: '{"x":1}',
    });

    const response = await handler(createMockEvent(request));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer svelte-test-key',
        }),
      })
    );
  });
});
