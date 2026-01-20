/**
 * @inferencesh/sdk/proxy - Server-side proxy for Inference.sh API
 *
 * Protects API keys by proxying requests from frontend apps through your server.
 * Supports Next.js (App & Page Router), Express, Hono, Remix, and SvelteKit.
 */

export const TARGET_URL_HEADER = "x-inf-target-url";
export const DEFAULT_PROXY_ROUTE = "/api/inference/proxy";

const INFERENCE_API_KEY = process.env.INFERENCE_API_KEY;

export type HeaderValue = string | string[] | undefined | null;

// Only allow requests to inference.sh domains
const INFERENCE_URL_REGEX = /(\.|^)inference\.sh$/;

/**
 * The proxy behavior interface - a subset of request/response objects
 * that abstracts framework-specific APIs.
 */
export interface ProxyBehavior<ResponseType> {
    /** Framework identifier for logging/debugging */
    id: string;
    /** HTTP method */
    method: string;
    /** Return an error response */
    respondWith(status: number, data: string | object): ResponseType;
    /** Pass through a fetch Response */
    sendResponse(response: Response): Promise<ResponseType>;
    /** Get all headers as a record */
    getHeaders(): Record<string, HeaderValue>;
    /** Get a single header value */
    getHeader(name: string): HeaderValue;
    /** Set a response header */
    sendHeader(name: string, value: string): void;
    /** Get the request body as a string */
    getRequestBody(): Promise<string | undefined>;
    /** Optional custom API key resolver */
    resolveApiKey?: () => Promise<string | undefined>;
}

/**
 * Utility to get a header value as string from potentially array value.
 */
function singleHeaderValue(value: HeaderValue): string | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) return value[0];
    return value;
}

/**
 * Get the API key from environment variables.
 */
function getApiKey(): string | undefined {
    return INFERENCE_API_KEY;
}

// Headers to exclude from response passthrough
const EXCLUDED_HEADERS = ["content-length", "content-encoding"];

/**
 * Core proxy request handler.
 *
 * Proxies requests to the Inference.sh API with server-side credential injection.
 * This handler is framework-agnostic and works via the ProxyBehavior interface.
 *
 * @param behavior - Framework-specific request/response handling
 * @returns Promise that resolves when the request is handled
 */
export async function handleRequest<ResponseType>(
    behavior: ProxyBehavior<ResponseType>
): Promise<ResponseType> {
    // 1. Get and validate target URL
    const targetUrl = singleHeaderValue(behavior.getHeader(TARGET_URL_HEADER));
    if (!targetUrl) {
        return behavior.respondWith(400, {
            error: `Missing the ${TARGET_URL_HEADER} header`,
        });
    }

    // 2. Validate target is an inference.sh domain
    let urlHost: string;
    try {
        urlHost = new URL(targetUrl).host;
    } catch {
        return behavior.respondWith(400, {
            error: `Invalid ${TARGET_URL_HEADER} header: not a valid URL`,
        });
    }

    if (!INFERENCE_URL_REGEX.test(urlHost)) {
        return behavior.respondWith(412, {
            error: `Invalid ${TARGET_URL_HEADER} header: must be an inference.sh domain`,
        });
    }

    // 3. Get API key
    const apiKey = behavior.resolveApiKey
        ? await behavior.resolveApiKey()
        : getApiKey();

    if (!apiKey) {
        return behavior.respondWith(401, {
            error: "Missing INFERENCE_API_KEY environment variable",
        });
    }

    // 4. Build forwarded headers (x-inf-* prefixed)
    const forwardedHeaders: Record<string, string> = {};
    const allHeaders = behavior.getHeaders();
    for (const key of Object.keys(allHeaders)) {
        if (key.toLowerCase().startsWith("x-inf-")) {
            const value = singleHeaderValue(allHeaders[key]);
            if (value) {
                forwardedHeaders[key.toLowerCase()] = value;
            }
        }
    }

    // 5. Forward content-type if present
    const contentType = singleHeaderValue(behavior.getHeader("content-type"));

    // 6. Build proxy user agent
    const proxyUserAgent = `@inferencesh/sdk-proxy/${behavior.id}`;
    const userAgent = singleHeaderValue(behavior.getHeader("user-agent"));

    // 7. Make the proxied request
    const res = await fetch(targetUrl, {
        method: behavior.method,
        headers: {
            ...forwardedHeaders,
            authorization:
                singleHeaderValue(behavior.getHeader("authorization")) ??
                `Bearer ${apiKey}`,
            accept: "application/json",
            "content-type": contentType || "application/json",
            "user-agent": userAgent || proxyUserAgent,
            "x-inf-client-proxy": proxyUserAgent,
        } as HeadersInit,
        body:
            behavior.method?.toUpperCase() === "GET"
                ? undefined
                : await behavior.getRequestBody(),
    });

    // 8. Copy response headers (excluding certain ones)
    res.headers.forEach((value, key) => {
        if (!EXCLUDED_HEADERS.includes(key.toLowerCase())) {
            behavior.sendHeader(key, value);
        }
    });

    // 9. Return the response
    return behavior.sendResponse(res);
}

/**
 * Convert a Headers object to a plain record.
 */
export function fromHeaders(
    headers: Headers
): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}

/**
 * Simple passthrough for Response objects (used in app router style handlers).
 */
export const responsePassthrough = (res: Response) => Promise.resolve(res);

/**
 * Resolve API key from environment (exposed for custom handlers).
 */
export const resolveApiKeyFromEnv = () => Promise.resolve(getApiKey());
