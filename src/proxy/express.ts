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
 * app.all(PROXY_ROUTE, createHandler());
 * ```
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
    PROXY_PATH,
    processProxyRequest,
    HttpHeaderValue,
    INF_TARGET_PARAM,
} from "./index";

/** Default proxy route path */
export const PROXY_ROUTE = PROXY_PATH;

/** @deprecated Use PROXY_ROUTE */
export const route = PROXY_ROUTE;

export interface ExpressProxyOptions {
    /** Custom API key (overrides INFERENCE_API_KEY env var) */
    apiKey?: string;
}

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
        return processProxyRequest({
            framework: "express",
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
        }, options);
    };
}

/** @deprecated Use createHandler() */
export const handler: RequestHandler = createHandler();
