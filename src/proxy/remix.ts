/**
 * @inferencesh/sdk/proxy/remix - Remix Framework Proxy Handler
 *
 * Works with Remix's loader and action functions.
 *
 * @example
 * ```typescript
 * // app/routes/api.inference.proxy.ts
 * import { createHandler } from "@inferencesh/sdk/proxy/remix";
 *
 * const handler = createHandler();
 *
 * export const loader = handler;
 * export const action = handler;
 * ```
 */

import {
    processProxyRequest,
    getEnvApiKey,
    passthrough,
    headersToRecord,
    INF_TARGET_PARAM,
} from "./index";

export interface RemixProxyOptions {
    /** Custom function to resolve the API key */
    resolveApiKey?: () => Promise<string | undefined>;
}

type RemixHandler = (args: { request: Request }) => Promise<Response>;

/**
 * Creates a Remix request handler for the Inference.sh proxy.
 * Use this as both a loader and action in your Remix route.
 */
export function createHandler({
    resolveApiKey = getEnvApiKey,
}: RemixProxyOptions = {}): RemixHandler {
    return async ({ request }) => {
        const responseHeaders = new Headers();
        const url = new URL(request.url);

        return processProxyRequest({
            framework: "remix",
            method: request.method,
            body: () => request.text(),
            headers: () => headersToRecord(request.headers),
            header: (name) => request.headers.get(name),
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
export const createRequestHandler = createHandler;
