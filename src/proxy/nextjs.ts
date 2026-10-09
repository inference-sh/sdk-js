/**
 * @inferencesh/sdk/proxy/nextjs - Next.js Proxy Handlers
 *
 * Supports both App Router (route handlers) and Page Router (API routes).
 *
 * @example App Router (app/api/inference/proxy/route.ts)
 * ```typescript
 * import { createHandler } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = createHandler({ allowedEndpoints: ["my-team/*"] });
 * ```
 *
 * @example Page Router (pages/api/inference/proxy.ts)
 * ```typescript
 * import { createPageHandler } from "@inferencesh/sdk/proxy/nextjs";
 * export default createPageHandler({ allowedEndpoints: ["my-team/*"] });
 * ```
 */

import { NextResponse, type NextRequest } from "next/server";
import type { NextApiHandler, NextApiRequest } from "next/types";
import {
    PROXY_PATH,
    processProxyRequest,
    headersToRecord,
    type ProxyOptions,
} from "./index";

// ============================================================================
// Exports
// ============================================================================

/** Default proxy route path */
export const PROXY_ROUTE = PROXY_PATH;

// ============================================================================
// Page Router Handler
// ============================================================================

/**
 * Page Router API handler for the Inference.sh proxy.
 *
 * Note: Page Router doesn't support streaming responses.
 * For streaming SSE, use the App Router.
 *
 * @example
 * ```typescript
 * // pages/api/inference/proxy.ts
 * import { createPageHandler } from "@inferencesh/sdk/proxy/nextjs";
 * export default createPageHandler({ allowedEndpoints: ["my-team/*"] });
 * ```
 */
export function createPageHandler(options?: ProxyOptions<NextApiRequest>): NextApiHandler {
    return async (request, response) => {
        return processProxyRequest({
            framework: "nextjs-pages",
            request,
            method: request.method || "POST",
            body: async () => JSON.stringify(request.body),
            headers: () => request.headers as Record<string, string | string[]>,
            header: (name) => request.headers[name],
            query: (name) => {
                const value = request.query[name];
                return Array.isArray(value) ? value[0] : value;
            },
            setHeader: (name, value) => response.setHeader(name, value),
            error: (status, data) => response.status(status).json(data),
            respond: async (res) => {
                const contentType = res.headers.get("content-type") || "";
                if (contentType.includes("application/json")) {
                    return response.status(res.status).json(await res.json());
                }
                return response.status(res.status).send(await res.text());
            },
        }, options);
    };
}

/** Page Router handler with the default options. */
export const pageHandler: NextApiHandler = createPageHandler();

// ============================================================================
// App Router Handler
// ============================================================================

/**
 * Create App Router route handlers for the Inference.sh proxy.
 * Supports full streaming passthrough for SSE responses.
 *
 * @example
 * ```typescript
 * // app/api/inference/proxy/route.ts
 * import { createHandler } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = createHandler({ allowedEndpoints: ["my-team/*"] });
 * ```
 */
export function createHandler(options?: ProxyOptions<NextRequest>) {
    const appHandler = async (request: NextRequest) => {
        const responseHeaders = new Headers();
        const url = new URL(request.url);

        return processProxyRequest({
            framework: "nextjs-app",
            request,
            method: request.method,
            body: () => request.text(),
            headers: () => headersToRecord(request.headers),
            header: (name) => request.headers.get(name),
            query: (name) => url.searchParams.get(name) ?? undefined,
            setHeader: (name, value) => responseHeaders.set(name, value),
            error: (status, data) =>
                NextResponse.json(data, { status, headers: responseHeaders }),
            respond: async (response) => {
                // Return new Response with cleaned headers (content-encoding stripped)
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders,
                });
            },
        }, options);
    };
    return { GET: appHandler, POST: appHandler, PUT: appHandler };
}

/**
 * App Router route handlers with the default options.
 *
 * @example
 * ```typescript
 * // app/api/inference/proxy/route.ts
 * import { handlers } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = handlers;
 * ```
 */
export const handlers = createHandler();

// ============================================================================
// Legacy Exports (backwards compatibility)
// ============================================================================

/** @deprecated Use pageHandler */
export const handler = pageHandler;

/** @deprecated Use handlers */
export const route = {
    handler: handlers.GET,
    ...handlers,
};
