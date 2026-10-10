/**
 * @inferencesh/sdk/proxy/express - Express.js Proxy Handler
 *
 * @example
 * ```typescript
 * import express from "express";
 * import { createHandler, PROXY_ROUTE } from "@inferencesh/sdk/proxy/express";
 *
 * const app = express();
 * app.use(express.json());
 * app.all(PROXY_ROUTE, createHandler({ allowedEndpoints: ["my-team/*"] }));
 * ```
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
    PROXY_PATH,
    processProxyRequest,
    HttpHeaderValue,
    type ProxyOptions,
} from "./index";

/** Default proxy route path */
export const PROXY_ROUTE = PROXY_PATH;

/** @deprecated Use PROXY_ROUTE */
export const route = PROXY_ROUTE;

/** Proxy options; `isAuthenticated` receives the Express request. */
export type ExpressProxyOptions = ProxyOptions<Request>;

/**
 * Creates an Express middleware handler for the Inference.sh proxy.
 *
 * Requires `express.json()` middleware to be applied before this handler.
 */
export function createHandler(options?: ExpressProxyOptions): RequestHandler {
    return async (
        req: Request,
        res: Response,
        _next: NextFunction
    ) => {
        // The client hung up before the response finished: stop the upstream
        // request too. Chat and task streams never end on their own, so
        // without this the proxy keeps reading them for nobody and the open
        // upstream connection keeps the server process alive.
        const upstream = new AbortController();
        res.on("close", () => {
            if (!res.writableFinished) upstream.abort();
        });
        return processProxyRequest({
            framework: "express",
            signal: upstream.signal,
            request: req,
            method: req.method,
            body: async () => JSON.stringify(req.body),
            headers: () => req.headers as Record<string, HttpHeaderValue>,
            header: (name) => req.headers[name] as HttpHeaderValue,
            query: (name) => {
                const v = req.query[name];
                return typeof v === "string" ? v : undefined;
            },
            setHeader: (name, value) => res.setHeader(name, value),
            error: (status, data) => res.status(status).json(data),
            respond: async (response) => {
                res.status(response.status);

                // Handle streaming responses
                const contentType = response.headers.get("content-type");
                if (
                    contentType?.includes("text/event-stream") ||
                    contentType?.includes("application/x-ndjson") ||
                    contentType?.includes("application/octet-stream")
                ) {
                    if (response.body) {
                        const reader = response.body.getReader();
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            res.write(value);
                        }
                    }
                    res.end();
                    return res;
                }

                // Handle JSON responses
                if (contentType?.includes("application/json")) {
                    return res.json(await response.json());
                }

                // Handle text responses
                return res.send(await response.text());
            },
        }, options).catch((error) => {
            // Aborted because the client left; there is nobody to answer.
            if (upstream.signal.aborted) return res;
            throw error;
        });
    };
}

/** @deprecated Use createHandler() */
export const handler: RequestHandler = createHandler();
