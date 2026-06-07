/**
 * @inferencesh/sdk/proxy - Secure Server Proxy for Inference.sh API
 *
 * Protects API keys by proxying requests from frontend apps through your server.
 * Supports Next.js (App & Page Router), Express, Hono, Remix, and SvelteKit.
 *
 * @example Next.js App Router
 * ```typescript
 * // app/api/inference/proxy/route.ts
 * import { createHandler } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = createHandler();
 * ```
 */

// ============================================================================
// Constants
// ============================================================================

/** Header name for target URL */
export const INF_TARGET_HEADER = "x-inf-target-url";

/** Query param fallback for EventSource (browsers can't send headers with SSE) */
export const INF_TARGET_PARAM = "__inf_target";

/** Default proxy route path */
export const PROXY_PATH = "/api/inference/proxy";

/** Valid inference.sh domain pattern */
const VALID_DOMAIN_PATTERN = /(\.|^)inference\.sh$/;

/** Headers stripped from response (fetch auto-decompresses) */
const STRIP_RESPONSE_HEADERS = ["content-length", "content-encoding"];

// ============================================================================
// Types
// ============================================================================

/** Header value from various HTTP libraries */
export type HttpHeaderValue = string | string[] | undefined | null;

/**
 * Framework adapter interface for proxy handlers.
 * Implement this to support a new framework.
 */
export interface ProxyAdapter<T> {
    /** Framework name for user-agent */
    framework: string;

    /** HTTP method of the request */
    method: string;

    /** Get request body as string */
    body: () => Promise<string | undefined>;

    /** Get all request headers */
    headers: () => Record<string, HttpHeaderValue>;

    /** Get single header value */
    header: (name: string) => HttpHeaderValue;

    /** Get query parameter (optional, for SSE fallback) */
    query?: (name: string) => string | undefined;

    /** Set response header */
    setHeader: (name: string, value: string) => void;

    /** Send error response */
    error: (status: number, message: string | object) => T;

    /** Pass through fetch Response */
    respond: (response: Response) => Promise<T>;

    /** Custom API key resolver (optional) */
    apiKey?: () => Promise<string | undefined>;
}

/**
 * Proxy handler options.
 */
export interface ProxyOptions {
    /** Custom API key (defaults to INFERENCE_API_KEY env var) */
    apiKey?: string;

    /** Allow requests to additional domains (besides *.inference.sh) */
    allowedDomains?: RegExp[];
}

// ============================================================================
// Utilities
// ============================================================================

/** Get first value from header (may be array) */
function firstValue(value: HttpHeaderValue): string | undefined {
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : value;
}

/** Get API key from environment */
function envApiKey(): string | undefined {
    return process.env.INFERENCE_API_KEY;
}

/** Check if domain is allowed */
function isAllowedDomain(host: string, extraDomains?: RegExp[]): boolean {
    if (VALID_DOMAIN_PATTERN.test(host)) return true;
    if (extraDomains) {
        return extraDomains.some((pattern) => pattern.test(host));
    }
    return false;
}

// ============================================================================
// Core Handler
// ============================================================================

/**
 * Process a proxied request to the Inference.sh API.
 *
 * This is the core handler that works with any framework via the ProxyAdapter interface.
 * Framework-specific handlers (Next.js, Express, etc.) wrap this function.
 *
 * @param adapter - Framework-specific adapter
 * @param options - Optional configuration
 * @returns Promise resolving to the framework's response type
 */
export async function processProxyRequest<T>(
    adapter: ProxyAdapter<T>,
    options?: ProxyOptions
): Promise<T> {
    // 1. Extract target URL (header first, query param fallback for SSE)
    let targetUrl = firstValue(adapter.header(INF_TARGET_HEADER));

    if (!targetUrl && adapter.query) {
        const queryParam = adapter.query(INF_TARGET_PARAM);
        if (queryParam) {
            targetUrl = decodeURIComponent(queryParam);
        }
    }

    if (!targetUrl) {
        return adapter.error(400, {
            error: `Missing ${INF_TARGET_HEADER} header or ${INF_TARGET_PARAM} query param`,
        });
    }

    // 2. Validate target domain
    let host: string;
    try {
        host = new URL(targetUrl).host;
    } catch {
        return adapter.error(400, { error: "Invalid target URL" });
    }

    if (!isAllowedDomain(host, options?.allowedDomains)) {
        return adapter.error(412, {
            error: `Target must be an inference.sh domain, got: ${host}`,
        });
    }

    // 3. Resolve API key
    const apiKey = options?.apiKey
        ?? (adapter.apiKey ? await adapter.apiKey() : undefined)
        ?? envApiKey();

    if (!apiKey) {
        return adapter.error(401, {
            error: "Missing INFERENCE_API_KEY environment variable",
        });
    }

    // 4. Collect x-inf-* headers to forward
    const forwardHeaders: Record<string, string> = {};
    const allHeaders = adapter.headers();
    for (const [key, value] of Object.entries(allHeaders)) {
        if (key.toLowerCase().startsWith("x-inf-")) {
            const v = firstValue(value);
            if (v) forwardHeaders[key.toLowerCase()] = v;
        }
    }

    // 5. Build request headers
    const contentType = firstValue(adapter.header("content-type"));
    const userAgent = firstValue(adapter.header("user-agent"));
    const proxyId = `@inferencesh/sdk-proxy/${adapter.framework}`;

    // 6. Make upstream request
    const response = await fetch(targetUrl, {
        method: adapter.method,
        headers: {
            ...forwardHeaders,
            authorization: firstValue(adapter.header("authorization")) ?? `Bearer ${apiKey}`,
            accept: "application/json",
            "content-type": contentType || "application/json",
            "user-agent": userAgent || proxyId,
            "x-inf-proxy": proxyId,
        } as HeadersInit,
        body: adapter.method.toUpperCase() === "GET" ? undefined : await adapter.body(),
    });

    // 7. Forward response headers (strip compression headers since fetch decompresses)
    response.headers.forEach((value, key) => {
        if (!STRIP_RESPONSE_HEADERS.includes(key.toLowerCase())) {
            adapter.setHeader(key, value);
        }
    });

    // 8. Return response
    return adapter.respond(response);
}

// ============================================================================
// Helpers for Framework Adapters
// ============================================================================

/**
 * Convert Headers object to plain record.
 */
export function headersToRecord(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
        result[key] = value;
    });
    return result;
}

/**
 * Simple response passthrough (for App Router style handlers).
 */
export const passthrough = (res: Response) => Promise.resolve(res);

/**
 * Resolve API key from INFERENCE_API_KEY env var.
 */
export const getEnvApiKey = () => Promise.resolve(envApiKey());

// ============================================================================
// Legacy Exports (backwards compatibility)
// ============================================================================

/** @deprecated Use INF_TARGET_HEADER */
export const TARGET_URL_HEADER = INF_TARGET_HEADER;

/** @deprecated Use INF_TARGET_PARAM */
export const TARGET_URL_QUERY_PARAM = INF_TARGET_PARAM;

/** @deprecated Use PROXY_PATH */
export const DEFAULT_PROXY_ROUTE = PROXY_PATH;

/** @deprecated Use ProxyAdapter */
export type ProxyBehavior<T> = ProxyAdapter<T>;

/** @deprecated Use processProxyRequest */
export const handleRequest = processProxyRequest;

/** @deprecated Use headersToRecord */
export const fromHeaders = headersToRecord;

/** @deprecated Use passthrough */
export const responsePassthrough = passthrough;

/** @deprecated Use getEnvApiKey */
export const resolveApiKeyFromEnv = getEnvApiKey;
