/**
 * @inferencesh/sdk/proxy/svelte - SvelteKit Proxy Handler
 *
 * Works with SvelteKit's +server.ts route handlers.
 *
 * @example
 * ```typescript
 * // src/routes/api/inference/proxy/+server.ts
 * import { createHandler } from "@inferencesh/sdk/proxy/svelte";
 *
 * const handler = createHandler();
 *
 * export const GET = handler;
 * export const POST = handler;
 * export const PUT = handler;
 * ```
 */

import type { RequestEvent } from "@sveltejs/kit";
import {
    processProxyRequest,
    getEnvApiKey,
    passthrough,
    headersToRecord,
    INF_TARGET_PARAM,
} from "./index";

export interface SvelteProxyOptions {
    /** Custom function to resolve the API key */
    resolveApiKey?: () => Promise<string | undefined>;
}

type SvelteRequestHandler = (event: RequestEvent) => Promise<Response>;

/**
 * Creates a SvelteKit request handler for the Inference.sh proxy.
 *
 * @param options - Proxy options
 * @returns A SvelteKit request handler function
 */
export function createHandler({
    resolveApiKey = getEnvApiKey,
}: SvelteProxyOptions = {}): SvelteRequestHandler {
    return async (event) => {
        const request = event.request;
        const url = new URL(request.url);
        const responseHeaders = new Headers();

        return processProxyRequest({
            framework: "sveltekit",
            method: request.method,
            body: () => request.text(),
            headers: () => headersToRecord(request.headers),
            header: (name) => request.headers.get(name),
            query: (name) => url.searchParams.get(name) ?? undefined,
            setHeader: (name: string, value: string) => responseHeaders.set(name, value),
            error: (status: number, data: string | object) =>
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
export const createRequestHandler = createHandler;
