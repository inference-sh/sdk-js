import {
    handleRequest,
    ProxyBehavior,
    TARGET_URL_HEADER,
    HeaderValue,
    fromHeaders,
} from './index';

// Store original fetch
const originalFetch = global.fetch;

describe('Proxy Core', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    /**
     * Helper to create a mock ProxyBehavior for testing
     */
    function createMockBehavior(
        overrides: Partial<ProxyBehavior<Response>> = {}
    ): ProxyBehavior<Response> & { responseHeaders: Record<string, string> } {
        const responseHeaders: Record<string, string> = {};
        const headers: Record<string, HeaderValue> = {
            [TARGET_URL_HEADER]: 'https://api.inference.sh/apps/run',
            'content-type': 'application/json',
        };

        return {
            id: 'test',
            method: 'POST',
            responseHeaders,
            respondWith: jest.fn((status, data) =>
                new Response(JSON.stringify(data), { status })
            ),
            sendResponse: jest.fn(async (res) => res),
            getHeaders: () => headers,
            getHeader: (name) => headers[name.toLowerCase()],
            sendHeader: (name, value) => {
                responseHeaders[name] = value;
            },
            getRequestBody: async () => JSON.stringify({ test: true }),
            // Always provide resolveApiKey so we don't depend on env at load time
            resolveApiKey: async () => 'test-api-key',
            ...overrides,
        };
    }

    describe('handleRequest', () => {
        it('should return 400 when target URL header is missing', async () => {
            const behavior = createMockBehavior({
                getHeader: () => undefined,
            });

            await handleRequest(behavior);

            expect(behavior.respondWith).toHaveBeenCalledWith(400, {
                error: `Missing the ${TARGET_URL_HEADER} header`,
            });
        });

        it('should return 400 for invalid URL', async () => {
            const headers: Record<string, HeaderValue> = {
                [TARGET_URL_HEADER]: 'not-a-valid-url',
            };
            const behavior = createMockBehavior({
                getHeaders: () => headers,
                getHeader: (name) => headers[name.toLowerCase()],
            });

            await handleRequest(behavior);

            expect(behavior.respondWith).toHaveBeenCalledWith(400, {
                error: `Invalid ${TARGET_URL_HEADER} header: not a valid URL`,
            });
        });

        it('should return 412 for non-inference.sh domains', async () => {
            const headers: Record<string, HeaderValue> = {
                [TARGET_URL_HEADER]: 'https://evil.com/api',
            };
            const behavior = createMockBehavior({
                getHeaders: () => headers,
                getHeader: (name) => headers[name.toLowerCase()],
            });

            await handleRequest(behavior);

            expect(behavior.respondWith).toHaveBeenCalledWith(412, {
                error: `Invalid ${TARGET_URL_HEADER} header: must be an inference.sh domain`,
            });
        });

        it('should return 401 when API key resolver returns undefined', async () => {
            const behavior = createMockBehavior({
                resolveApiKey: async () => undefined,
            });

            await handleRequest(behavior);

            expect(behavior.respondWith).toHaveBeenCalledWith(401, {
                error: 'Missing INFERENCE_API_KEY environment variable',
            });
        });

        it('should accept valid inference.sh domains', async () => {
            const validDomains = [
                'https://api.inference.sh/apps/run',
                'https://inference.sh/api/test',
                'https://sub.api.inference.sh/endpoint',
            ];

            global.fetch = jest.fn().mockResolvedValue(
                new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                })
            );

            for (const targetUrl of validDomains) {
                jest.clearAllMocks();
                const headers: Record<string, HeaderValue> = {
                    [TARGET_URL_HEADER]: targetUrl,
                    'content-type': 'application/json',
                };
                const behavior = createMockBehavior({
                    getHeaders: () => headers,
                    getHeader: (name) => headers[name.toLowerCase()],
                });

                await handleRequest(behavior);

                expect(behavior.sendResponse).toHaveBeenCalled();
                expect(behavior.respondWith).not.toHaveBeenCalled();
            }
        });

        it('should forward x-inf-* headers', async () => {
            global.fetch = jest.fn().mockResolvedValue(
                new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                })
            );

            const headers: Record<string, HeaderValue> = {
                [TARGET_URL_HEADER]: 'https://api.inference.sh/test',
                'content-type': 'application/json',
                'x-inf-custom-header': 'custom-value',
                'x-inf-another': 'another-value',
                'x-other-header': 'should-not-forward', // Not x-inf-*, shouldn't be forwarded
            };
            const behavior = createMockBehavior({
                getHeaders: () => headers,
                getHeader: (name) => headers[name.toLowerCase()],
            });

            await handleRequest(behavior);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.inference.sh/test',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'x-inf-custom-header': 'custom-value',
                        'x-inf-another': 'another-value',
                        authorization: 'Bearer test-api-key',
                    }),
                })
            );

            // Verify x-other-header was not forwarded
            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const fetchHeaders = fetchCall[1].headers;
            expect(fetchHeaders['x-other-header']).toBeUndefined();
        });

        it('should use custom resolveApiKey function', async () => {
            global.fetch = jest.fn().mockResolvedValue(
                new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                })
            );

            const behavior = createMockBehavior({
                resolveApiKey: async () => 'custom-api-key',
            });

            await handleRequest(behavior);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        authorization: 'Bearer custom-api-key',
                    }),
                })
            );
        });

        it('should not send body for GET requests', async () => {
            global.fetch = jest.fn().mockResolvedValue(
                new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { 'content-type': 'application/json' },
                })
            );

            const behavior = createMockBehavior({
                method: 'GET',
            });

            await handleRequest(behavior);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'GET',
                    body: undefined,
                })
            );
        });

        it('should copy response headers (excluding content-length/encoding)', async () => {
            const responseHeaders = new Headers();
            responseHeaders.set('x-custom-response', 'value');
            responseHeaders.set('content-length', '100'); // Should be excluded
            responseHeaders.set('content-encoding', 'gzip'); // Should be excluded

            global.fetch = jest.fn().mockResolvedValue(
                new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: responseHeaders,
                })
            );

            const behavior = createMockBehavior();
            await handleRequest(behavior);

            expect(behavior.responseHeaders['x-custom-response']).toBe('value');
            expect(behavior.responseHeaders['content-length']).toBeUndefined();
            expect(behavior.responseHeaders['content-encoding']).toBeUndefined();
        });

        it('should reject attempts to proxy to non-inference.sh subdomains', async () => {
            const invalidDomains = [
                'https://notinference.sh/api',
                'https://inference.sh.evil.com/api',
                'https://api.inference.io/test',
            ];

            for (const targetUrl of invalidDomains) {
                const headers: Record<string, HeaderValue> = {
                    [TARGET_URL_HEADER]: targetUrl,
                };
                const behavior = createMockBehavior({
                    getHeaders: () => headers,
                    getHeader: (name) => headers[name.toLowerCase()],
                });

                await handleRequest(behavior);

                expect(behavior.respondWith).toHaveBeenCalledWith(412, {
                    error: `Invalid ${TARGET_URL_HEADER} header: must be an inference.sh domain`,
                });
            }
        });
    });

    describe('fromHeaders', () => {
        it('should convert Headers to plain object', () => {
            const headers = new Headers();
            headers.set('content-type', 'application/json');
            headers.set('x-custom', 'value');

            const result = fromHeaders(headers);

            expect(result).toEqual({
                'content-type': 'application/json',
                'x-custom': 'value',
            });
        });

        it('should handle empty headers', () => {
            const headers = new Headers();
            const result = fromHeaders(headers);
            expect(result).toEqual({});
        });
    });
});
