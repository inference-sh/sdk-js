/**
 * Next.js proxy handlers for Inference.sh API
 *
 * Supports both App Router (route handlers) and Page Router (API handlers).
 *
 * @example App Router (app/api/inference/proxy/route.ts)
 * ```typescript
 * import { route } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = route;
 * ```
 *
 * @example Page Router (pages/api/inference/proxy.ts)
 * ```typescript
 * export { handler as default } from "@inferencesh/sdk/proxy/nextjs";
 * ```
 */

import { NextResponse, type NextRequest } from "next/server";
import type { NextApiHandler } from "next/types";
import {
    DEFAULT_PROXY_ROUTE,
    fromHeaders,
    handleRequest,
    responsePassthrough,
} from "./index";

/**
 * The default proxy route path.
 */
export const PROXY_ROUTE = DEFAULT_PROXY_ROUTE;

/**
 * Page Router handler for the Inference.sh proxy.
 *
 * Note: Page Router proxy doesn't support streaming responses.
 * For streaming, use the App Router.
 *
 * @example
 * ```typescript
 * // pages/api/inference/proxy.ts
 * export { handler as default } from "@inferencesh/sdk/proxy/nextjs";
 * ```
 */
export const handler: NextApiHandler = async (request, response) => {
    return handleRequest({
        id: "nextjs-page-router",
        method: request.method || "POST",
        getRequestBody: async () => JSON.stringify(request.body),
        getHeaders: () => request.headers as Record<string, string | string[]>,
        getHeader: (name) => request.headers[name],
        sendHeader: (name, value) => response.setHeader(name, value),
        respondWith: (status, data) => response.status(status).json(data),
        sendResponse: async (res) => {
            if (res.headers.get("content-type")?.includes("application/json")) {
                return response.status(res.status).json(await res.json());
            }
            return response.status(res.status).send(await res.text());
        },
    });
};

/**
 * App Router handler for the Inference.sh proxy.
 *
 * Supports full streaming passthrough for SSE responses.
 *
 * @param request - Next.js request object
 * @returns Response object
 */
async function routeHandler(request: NextRequest) {
    const responseHeaders = new Headers();
    return await handleRequest({
        id: "nextjs-app-router",
        method: request.method,
        getRequestBody: async () => request.text(),
        getHeaders: () => fromHeaders(request.headers),
        getHeader: (name) => request.headers.get(name),
        sendHeader: (name, value) => responseHeaders.set(name, value),
        respondWith: (status, data) =>
            NextResponse.json(data, {
                status,
                headers: responseHeaders,
            }),
        sendResponse: responsePassthrough,
    });
}

/**
 * App Router route exports.
 *
 * @example
 * ```typescript
 * // app/api/inference/proxy/route.ts
 * import { route } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = route;
 * ```
 */
export const route = {
    handler: routeHandler,
    GET: routeHandler,
    POST: routeHandler,
    PUT: routeHandler,
};
