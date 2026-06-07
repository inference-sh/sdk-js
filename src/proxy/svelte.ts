/**
 * SvelteKit proxy handler for Inference.sh API
 *
 * Works with SvelteKit's +server.ts route handlers.
 *
 * @example
 * ```typescript
 * // src/routes/api/inference/proxy/+server.ts
 * import { createRequestHandler } from "@inferencesh/sdk/proxy/svelte";
 *
 * const handler = createRequestHandler();
 *
 * export const GET = handler;
 * export const POST = handler;
 * export const PUT = handler;
 * ```
 */

import type { RequestEvent } from "@sveltejs/kit";
import {
    handleRequest,
    resolveApiKeyFromEnv,
    responsePassthrough,
    fromHeaders,
} from "./index";

export interface SvelteProxyOptions {
    /**
     * Custom function to resolve the API key.
     * Defaults to reading from INFERENCE_API_KEY environment variable.
     */
    resolveApiKey?: () => Promise<string | undefined>;
}

type SvelteRequestHandler = (event: RequestEvent) => Promise<Response>;

/**
 * Creates a SvelteKit request handler that proxies requests to the Inference.sh API.
 *
 * @param options - Proxy options
 * @returns A SvelteKit request handler function
 *
 * @example
 * ```typescript
 * // src/routes/api/inference/proxy/+server.ts
 * import { createRequestHandler } from "@inferencesh/sdk/proxy/svelte";
 *
 * const handler = createRequestHandler();
 *
 * export const GET = handler;
 * export const POST = handler;
 * export const PUT = handler;
 * ```
 */
export function createRequestHandler({
    resolveApiKey = resolveApiKeyFromEnv,
}: SvelteProxyOptions = {}): SvelteRequestHandler {
    return async (event) => {
        const request = event.request;
        const responseHeaders = new Headers();

        return handleRequest({
            id: "svelte",
            method: request.method,
            getRequestBody: async () => request.text(),
            getHeaders: () => fromHeaders(request.headers),
            getHeader: (name) => request.headers.get(name),
            sendHeader: (name, value) => responseHeaders.set(name, value),
            respondWith: (status, data) =>
                new Response(JSON.stringify(data), {
                    status,
                    headers: {
                        "Content-Type": "application/json",
                        ...Object.fromEntries(responseHeaders.entries()),
                    },
                }),
            sendResponse: responsePassthrough,
            resolveApiKey,
        });
    };
}
