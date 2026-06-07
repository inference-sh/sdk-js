/**
 * Hono proxy handler for Inference.sh API
 *
 * Lightweight handler for Hono framework, ideal for edge/serverless deployments.
 *
 * @example
 * ```typescript
 * import { Hono } from "hono";
 * import { createRouteHandler } from "@inferencesh/sdk/proxy/hono";
 *
 * const app = new Hono();
 * const proxyHandler = createRouteHandler();
 *
 * app.all("/api/inference/proxy", proxyHandler);
 * ```
 */

import type { Context } from "hono";
import {
    handleRequest,
    HeaderValue,
    resolveApiKeyFromEnv,
    responsePassthrough,
    fromHeaders,
} from "./index";

export interface HonoProxyOptions {
    /**
     * Custom function to resolve the API key.
     * Defaults to reading from INFERENCE_API_KEY environment variable.
     */
    resolveApiKey?: () => Promise<string | undefined>;
}

type RouteHandler = (context: Context) => Promise<Response>;

/**
 * Creates a Hono route handler that proxies requests to the Inference.sh API.
 *
 * This is a drop-in handler for Hono applications that keeps API keys safe
 * by running on your server.
 *
 * @param options - Proxy options
 * @returns A Hono route handler function
 *
 * @example
 * ```typescript
 * import { Hono } from "hono";
 * import { createRouteHandler } from "@inferencesh/sdk/proxy/hono";
 *
 * const app = new Hono();
 * const proxyHandler = createRouteHandler();
 *
 * app.all("/api/inference/proxy", proxyHandler);
 *
 * export default app;
 * ```
 *
 * @example Custom API key resolver
 * ```typescript
 * const proxyHandler = createRouteHandler({
 *   resolveApiKey: async () => {
 *     // Load from a secrets manager
 *     return await getSecretFromVault("INFERENCE_API_KEY");
 *   },
 * });
 * ```
 */
export function createRouteHandler({
    resolveApiKey = resolveApiKeyFromEnv,
}: HonoProxyOptions = {}): RouteHandler {
    const routeHandler: RouteHandler = async (context) => {
        const responseHeaders = new Headers();

        return handleRequest({
            id: "hono",
            method: context.req.method,
            respondWith: (status, data) => {
                return new Response(JSON.stringify(data), {
                    status,
                    headers: {
                        "Content-Type": "application/json",
                        ...Object.fromEntries(responseHeaders.entries()),
                    },
                });
            },
            getHeaders: () => fromHeaders(context.req.raw.headers),
            getHeader: (name) => context.req.header(name),
            sendHeader: (name, value) => responseHeaders.set(name, value),
            getRequestBody: async () => {
                try {
                    return await context.req.text();
                } catch {
                    return undefined;
                }
            },
            sendResponse: responsePassthrough,
            resolveApiKey,
        });
    };

    return routeHandler;
}
