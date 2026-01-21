/**
 * @inferencesh/sdk/proxy/hono - Hono Framework Proxy Handler
 *
 * Lightweight handler for Hono, ideal for edge/serverless deployments.
 *
 * @example
 * ```typescript
 * import { Hono } from "hono";
 * import { createHandler } from "@inferencesh/sdk/proxy/hono";
 *
 * const app = new Hono();
 * app.all("/api/inference/proxy", createHandler());
 * ```
 */

import type { Context } from "hono";
import {
    processProxyRequest,
    getEnvApiKey,
    passthrough,
    headersToRecord,
    INF_TARGET_PARAM,
} from "./index";

export interface HonoProxyOptions {
    /** Custom function to resolve the API key */
    resolveApiKey?: () => Promise<string | undefined>;
}

type HonoHandler = (context: Context) => Promise<Response>;

/**
 * Creates a Hono route handler for the Inference.sh proxy.
 */
export function createHandler({
    resolveApiKey = getEnvApiKey,
}: HonoProxyOptions = {}): HonoHandler {
    return async (context) => {
        const responseHeaders = new Headers();
        const url = new URL(context.req.url);

        return processProxyRequest({
            framework: "hono",
            method: context.req.method,
            body: async () => {
                try {
                    return await context.req.text();
                } catch {
                    return undefined;
                }
            },
            headers: () => headersToRecord(context.req.raw.headers),
            header: (name) => context.req.header(name),
            query: (name) => url.searchParams.get(name) ?? undefined,
            setHeader: (name, value) => responseHeaders.set(name, value),
            error: (status, data) =>
                new Response(JSON.stringify(data), {
                    status,
                    headers: {
                        "Content-Type": "application/json",
                        ...Object.fromEntries(responseHeaders.entries()),
                    },
                }),
            respond: passthrough,
            apiKey: resolveApiKey,
        });
    };
}

/** @deprecated Use createHandler */
export const createRouteHandler = createHandler;
