import {
  getEnvApiKey,
  INF_TARGET_HEADER,
  INF_TARGET_PARAM,
  headersToRecord,
  processProxyRequest,
  type ProxyAdapter,
} from './index';

type ProxyResult = {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  upstreamUrl?: string;
  upstreamInit?: RequestInit;
};

function createTestAdapter(overrides: Partial<ProxyAdapter<ProxyResult>> = {}): ProxyAdapter<ProxyResult> {
  const state: ProxyResult = { status: 0 };

  const adapter: ProxyAdapter<ProxyResult> = {
    framework: 'test',
    method: 'POST',
    body: async () => '{"ok":true}',
    headers: () => ({}),
    header: () => undefined,
    query: () => undefined,
    setHeader: (name, value) => {
      state.headers = state.headers ?? {};
      state.headers[name] = value;
    },
    error: (status, message) => {
      state.status = status;
      state.body = message;
      return state;
    },
    respond: async (response) => {
      state.status = response.status;
      state.body = await response.text();
      return state;
    },
    ...overrides,
  };

  return adapter;
}

describe('headersToRecord', () => {
  it('should convert Headers to a plain record', () => {
    const headers = new Headers({ 'x-test': 'value', 'content-type': 'application/json' });
    expect(headersToRecord(headers)).toEqual({
      'x-test': 'value',
      'content-type': 'application/json',
    });
  });
});

describe('getEnvApiKey', () => {
  const originalInferenceApiKey = process.env.INFERENCE_API_KEY;
  const originalApiKey = process.env.API_KEY;

  afterEach(() => {
    if (originalInferenceApiKey === undefined) {
      delete process.env.INFERENCE_API_KEY;
    } else {
      process.env.INFERENCE_API_KEY = originalInferenceApiKey;
    }
    if (originalApiKey === undefined) {
      delete process.env.API_KEY;
    } else {
      process.env.API_KEY = originalApiKey;
    }
  });

  it('should prefer INFERENCE_API_KEY over API_KEY', async () => {
    process.env.INFERENCE_API_KEY = 'inference-key';
    process.env.API_KEY = 'legacy-key';

    await expect(getEnvApiKey()).resolves.toBe('inference-key');
  });

  it('should fall back to API_KEY when INFERENCE_API_KEY is unset', async () => {
    delete process.env.INFERENCE_API_KEY;
    process.env.API_KEY = 'legacy-key';

    await expect(getEnvApiKey()).resolves.toBe('legacy-key');
  });
});

describe('processProxyRequest', () => {
  const originalFetch = global.fetch;
  const originalInferenceApiKey = process.env.INFERENCE_API_KEY;
  const originalApiKey = process.env.API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INFERENCE_API_KEY = 'env-test-key';
    delete process.env.API_KEY;
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalInferenceApiKey === undefined) {
      delete process.env.INFERENCE_API_KEY;
    } else {
      process.env.INFERENCE_API_KEY = originalInferenceApiKey;
    }
    if (originalApiKey === undefined) {
      delete process.env.API_KEY;
    } else {
      process.env.API_KEY = originalApiKey;
    }
  });

  it('should reject requests without a target URL', async () => {
    const result = await processProxyRequest(createTestAdapter());

    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      error: `Missing ${INF_TARGET_HEADER} header or ${INF_TARGET_PARAM} query param`,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should reject invalid target URLs', async () => {
    const result = await processProxyRequest(
      createTestAdapter({
        header: (name) => (name === INF_TARGET_HEADER ? 'not-a-url' : undefined),
      })
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: 'Invalid target URL' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should reject non-inference.sh domains', async () => {
    const result = await processProxyRequest(
      createTestAdapter({
        header: (name) =>
          name === INF_TARGET_HEADER ? 'https://evil.example.com/run' : undefined,
      })
    );

    expect(result.status).toBe(412);
    expect(result.body).toEqual({
      error: 'Target must be an inference.sh domain, got: evil.example.com',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should reject when no API key is configured', async () => {
    delete process.env.INFERENCE_API_KEY;
    delete process.env.API_KEY;

    const result = await processProxyRequest(
      createTestAdapter({
        header: (name) =>
          name === INF_TARGET_HEADER ? 'https://api.inference.sh/run' : undefined,
      })
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({
      error: 'Missing INFERENCE_API_KEY environment variable',
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should proxy valid inference.sh requests with env API key', async () => {
    const target = 'https://api.inference.sh/v1/tasks/1';

    const result = await processProxyRequest(
      createTestAdapter({
        header: (name) => (name === INF_TARGET_HEADER ? target : undefined),
      })
    );

    expect(result.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer env-test-key',
          'x-inf-proxy': '@inferencesh/sdk-proxy/test',
        }),
      })
    );
  });

  it('should fall back to API_KEY when INFERENCE_API_KEY is unset', async () => {
    delete process.env.INFERENCE_API_KEY;
    process.env.API_KEY = 'legacy-env-key';
    const target = 'https://api.inference.sh/v1/tasks/1';

    await processProxyRequest(
      createTestAdapter({
        header: (name) => (name === INF_TARGET_HEADER ? target : undefined),
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer legacy-env-key',
        }),
      })
    );
  });

  it('should prefer INFERENCE_API_KEY over API_KEY for upstream auth', async () => {
    process.env.INFERENCE_API_KEY = 'inference-env-key';
    process.env.API_KEY = 'legacy-env-key';
    const target = 'https://api.inference.sh/v1/tasks/1';

    await processProxyRequest(
      createTestAdapter({
        header: (name) => (name === INF_TARGET_HEADER ? target : undefined),
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer inference-env-key',
        }),
      })
    );
  });

  it('should resolve API key from adapter.apiKey when env key is missing', async () => {
    delete process.env.INFERENCE_API_KEY;
    delete process.env.API_KEY;
    const target = 'https://api.inference.sh/v1/tasks/1';
    const adapterApiKey = jest.fn().mockResolvedValue('tenant-dynamic-key');

    await processProxyRequest(
      createTestAdapter({
        apiKey: adapterApiKey,
        header: (name) => (name === INF_TARGET_HEADER ? target : undefined),
      })
    );

    expect(adapterApiKey).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer tenant-dynamic-key',
        }),
      })
    );
  });

  it('should prefer client Authorization header over env API key', async () => {
    const target = 'https://api.inference.sh/v1/tasks/1';

    await processProxyRequest(
      createTestAdapter({
        header: (name) => {
          if (name === INF_TARGET_HEADER) return target;
          if (name === 'authorization') return 'Bearer client-session-token';
          return undefined;
        },
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer client-session-token',
        }),
      })
    );
  });

  it('should use query param fallback when header is missing (SSE clients)', async () => {
    const target = 'https://api.inference.sh/v1/stream';
    const encoded = encodeURIComponent(target);

    await processProxyRequest(
      createTestAdapter({
        query: (name) => (name === INF_TARGET_PARAM ? encoded : undefined),
      })
    );

    expect(global.fetch).toHaveBeenCalledWith(target, expect.any(Object));
  });

  it('should honor custom allowedDomains', async () => {
    const target = 'https://cdn.custom.example/upload';

    await processProxyRequest(
      createTestAdapter({
        header: (name) => (name === INF_TARGET_HEADER ? target : undefined),
      }),
      { apiKey: 'custom-key', allowedDomains: [/custom\.example$/] }
    );

    expect(global.fetch).toHaveBeenCalledWith(target, expect.any(Object));
  });

  it('should forward x-inf-* request headers to upstream', async () => {
    const target = 'https://api.inference.sh/run';

    await processProxyRequest(
      createTestAdapter({
        header: (name) => {
          if (name === INF_TARGET_HEADER) return target;
          if (name === 'x-inf-session-id') return 'sess-123';
          return undefined;
        },
        headers: () => ({
          [INF_TARGET_HEADER]: target,
          'x-inf-session-id': 'sess-123',
        }),
      }),
      { apiKey: 'key' }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-inf-session-id': 'sess-123',
        }),
      })
    );
  });

  it('should forward X-API-Version and X-Client-Source to upstream', async () => {
    // X-API-Version is load-bearing: the API returns bare DTOs for "2" and the
    // legacy {success, status, data} envelope otherwise, and this SDK only
    // parses the former. Dropping it here made every proxied response
    // unparseable — the request succeeded server-side and the client saw
    // nothing, with no error raised.
    const target = 'https://api.inference.sh/agents/run';

    await processProxyRequest(
      createTestAdapter({
        header: (name) => {
          if (name === INF_TARGET_HEADER) return target;
          if (name === 'x-api-version') return '2';
          if (name === 'x-client-source') return 'inference-sdk-js/0.6.19';
          return undefined;
        },
        headers: () => ({
          [INF_TARGET_HEADER]: target,
          'X-API-Version': '2',
          'X-Client-Source': 'inference-sdk-js/0.6.19',
        }),
      }),
      { apiKey: 'key' }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-version': '2',
          'x-client-source': 'inference-sdk-js/0.6.19',
        }),
      })
    );
  });

  it('should strip content-encoding and content-length from proxied responses', async () => {
    const target = 'https://api.inference.sh/v1/tasks/1';
    const setHeader = jest.fn();

    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'content-encoding': 'gzip',
          'content-length': '42',
          'x-request-id': 'req-1',
        },
      })
    ) as typeof fetch;

    await processProxyRequest(
      createTestAdapter({
        header: (name) => (name === INF_TARGET_HEADER ? target : undefined),
        setHeader,
      })
    );

    expect(setHeader).toHaveBeenCalledWith('content-type', 'application/json');
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'req-1');
    expect(setHeader).not.toHaveBeenCalledWith('content-encoding', expect.anything());
    expect(setHeader).not.toHaveBeenCalledWith('content-length', expect.anything());
  });

  it('should omit body for GET requests', async () => {
    const target = 'https://api.inference.sh/tasks/1';

    await processProxyRequest(
      createTestAdapter({
        method: 'GET',
        header: (name) => (name === INF_TARGET_HEADER ? target : undefined),
      }),
      { apiKey: 'key' }
    );

    expect(global.fetch).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        method: 'GET',
        body: undefined,
      })
    );
  });
});
