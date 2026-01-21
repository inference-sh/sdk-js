/**
 * @inferencesh/sdk/proxy/nextjs - Next.js Proxy Handlers
 *
 * Supports both App Router (route handlers) and Page Router (API routes).
 *
 * @example App Router (app/api/inference/proxy/route.ts)
 * ```typescript
 * import { handlers } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = handlers;
 * ```
 *
 * @example Page Router (pages/api/inference/proxy.ts)
 * ```typescript
 * export { pageHandler as default } from "@inferencesh/sdk/proxy/nextjs";
 * ```
 */

import { NextResponse, type NextRequest } from "next/server";
import type { NextApiHandler } from "next/types";
import {
    PROXY_PATH,
    processProxyRequest,
    headersToRecord,
    passthrough,
    INF_TARGET_PARAM,
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
 * export { pageHandler as default } from "@inferencesh/sdk/proxy/nextjs";
 * ```
 */
export const pageHandler: NextApiHandler = async (request, response) => {
    return processProxyRequest({
        framework: "nextjs-pages",
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
    });
};

// ============================================================================
// App Router Handler
// ============================================================================

/**
 * Create an App Router handler for the Inference.sh proxy.
 * Supports full streaming passthrough for SSE responses.
 */
async function appHandler(request: NextRequest) {
    const responseHeaders = new Headers();
    const url = new URL(request.url);

    return processProxyRequest({
        framework: "nextjs-app",
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
    });
}

// ============================================================================
// Route Exports
// ============================================================================

/**
 * App Router route handlers.
 *
 * @example
 * ```typescript
 * // app/api/inference/proxy/route.ts
 * import { handlers } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = handlers;
 * ```
 */
export const handlers = {
    GET: appHandler,
    POST: appHandler,
    PUT: appHandler,
};

// ============================================================================
// Legacy Exports (backwards compatibility)
// ============================================================================

/** @deprecated Use pageHandler */
export const handler = pageHandler;

/** @deprecated Use handlers */
export const route = {
    handler: appHandler,
    GET: appHandler,
    POST: appHandler,
    PUT: appHandler,
};
