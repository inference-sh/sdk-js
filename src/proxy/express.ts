/**
 * Express.js proxy handler for Inference.sh API
 *
 * @example
 * ```typescript
 * import express from "express";
 * import * as inferenceProxy from "@inferencesh/sdk/proxy/express";
 *
 * const app = express();
 * app.use(express.json());
 * app.all(inferenceProxy.route, inferenceProxy.handler);
 * ```
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
    DEFAULT_PROXY_ROUTE,
    handleRequest,
    HeaderValue,
} from "./index";

/**
 * The default proxy route path.
 */
export const route = DEFAULT_PROXY_ROUTE;

/**
 * Express middleware handler for the Inference.sh proxy.
 *
 * Requires `express.json()` middleware to be applied before this handler.
 *
 * @example
 * ```typescript
 * import express from "express";
 * import cors from "cors";
 * import * as inferenceProxy from "@inferencesh/sdk/proxy/express";
 *
 * const app = express();
 * app.use(express.json());
 *
 * // If clients are external, enable CORS
 * app.all(inferenceProxy.route, cors(), inferenceProxy.handler);
 * ```
 */
export const handler: RequestHandler = async (
    req: Request,
    res: Response,
    _next: NextFunction
) => {
    const responseHeaders: Record<string, HeaderValue> = {};

    return handleRequest({
        id: "express",
        method: req.method,
        getRequestBody: async () => JSON.stringify(req.body),
        getHeaders: () => req.headers as Record<string, HeaderValue>,
        getHeader: (name) => req.headers[name],
        sendHeader: (name, value) => {
            responseHeaders[name] = value;
            res.setHeader(name, value);
        },
        respondWith: (status, data) => {
            return res.status(status).json(data);
        },
        sendResponse: async (response) => {
            // Copy status
            res.status(response.status);

            // Handle streaming responses
            const contentType = response.headers.get("content-type");
            if (
                contentType?.includes("text/event-stream") ||
                contentType?.includes("application/octet-stream")
            ) {
                // Stream the response
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
    });
};
