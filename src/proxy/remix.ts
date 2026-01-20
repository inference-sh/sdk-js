/**
 * Remix proxy handler for Inference.sh API
 *
 * Works with Remix's loader and action functions.
 *
 * @example
 * ```typescript
 * // app/routes/api.inference.proxy.ts
 * import { createRequestHandler } from "@inferencesh/sdk/proxy/remix";
 *
 * const handler = createRequestHandler();
 *
 * export const loader = handler;
 * export const action = handler;
 * ```
 */

import {
    handleRequest,
    HeaderValue,
    resolveApiKeyFromEnv,
    responsePassthrough,
    fromHeaders,
} from "./index";

export interface RemixProxyOptions {
    /**
     * Custom function to resolve the API key.
     * Defaults to reading from INFERENCE_API_KEY environment variable.
     */
    resolveApiKey?: () => Promise<string | undefined>;
}

type RemixRequestHandler = (args: { request: Request }) => Promise<Response>;

/**
 * Creates a Remix request handler that proxies requests to the Inference.sh API.
 *
 * Use this as both a loader and action in your Remix route.
 *
 * @param options - Proxy options
 * @returns A Remix request handler function
 *
 * @example
 * ```typescript
 * // app/routes/api.inference.proxy.ts
 * import { createRequestHandler } from "@inferencesh/sdk/proxy/remix";
 *
 * const handler = createRequestHandler();
 *
 * export const loader = handler;
 * export const action = handler;
 * ```
 */
export function createRequestHandler({
    resolveApiKey = resolveApiKeyFromEnv,
}: RemixProxyOptions = {}): RemixRequestHandler {
    return async ({ request }) => {
        const responseHeaders = new Headers();

        return handleRequest({
            id: "remix",
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
