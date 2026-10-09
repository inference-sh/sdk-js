/**
 * @inferencesh/sdk/proxy - Secure Server Proxy for Inference.sh API
 *
 * Protects API keys by proxying requests from frontend apps through your server.
 * Supports Next.js (App & Page Router), Express, Hono, Remix, and SvelteKit.
 *
 * The proxy forwards only what a frontend needs to run things (app runs,
 * agent chats, and reading or streaming their task or chat; see
 * PROXY_ENDPOINTS) and refuses every other API call with 403.
 *
 * @example Next.js App Router
 * ```typescript
 * // app/api/inference/proxy/route.ts
 * import { createHandler } from "@inferencesh/sdk/proxy/nextjs";
 * export const { GET, POST, PUT } = createHandler({
 *     allowedEndpoints: ["my-team/support-agent"],
 *     isAuthenticated: async (req) => Boolean(req.cookies.get("session")),
 * });
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
export interface ProxyAdapter<T, R = unknown> {
    /** Framework name for user-agent */
    framework: string;

    /** The framework's request, handed to `isAuthenticated` */
    request?: R;

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
export interface ProxyOptions<R = unknown> {
    /** Custom API key (defaults to INFERENCE_API_KEY env var) */
    apiKey?: string;

    /** Override API base URL (defaults to INFERENCE_API_BASE_URL env var) */
    apiBaseUrl?: string;

    /** Allow requests to additional domains (besides *.inference.sh) */
    allowedDomains?: RegExp[];

    /**
     * Apps and agents visitors may run, as `namespace/name` globs: "ana/helper",
     * or "ana/*" for all of a namespace. Unset or empty allows every app and
     * agent the API key can run.
     *
     * Checked where a request names the app or agent: a new app run, a new
     * chat or agent message, a chat handed to another agent, an agent's info.
     * Requests about an existing task or chat name it by id; the proxy cannot
     * tell which app or agent that is, so they are limited to reading,
     * streaming, stopping and answering it. When set, ad-hoc agent configs
     * (`agent_config`) and runs by `app_id`/`version_id` are refused.
     */
    allowedEndpoints?: string[];

    /**
     * Decides whether a request may use the API key, e.g. by checking your
     * session. Requests it answers false for are refused with 401. Receives
     * the framework's request (NextRequest, Express Request, Hono Context, ...).
     */
    isAuthenticated?: (request: R) => boolean | Promise<boolean>;

    /**
     * Without `isAuthenticated`, whether anyone may use the proxy (default
     * true, for compatibility). Set it to false to require `isAuthenticated`:
     * with neither, every request is refused.
     */
    allowUnauthorizedRequests?: boolean;
}

// ============================================================================
// Endpoint policy
// ============================================================================

/**
 * What the proxy forwards with the site's API key.
 *
 * A frontend needs the proxy to run things: run an app, start or continue an
 * agent chat, and read or stream the resulting task or chat. PROXY_ENDPOINTS
 * lists exactly the calls the SDK's own client makes for that (`run`,
 * `agent().sendMessage`, the agent chat provider) and nothing else, so
 * secrets, API keys, billing, account, file listings and app/agent management
 * are never reachable through it.
 *
 * `allowedEndpoints` then limits which apps and agents may be run. It is
 * checked where a request names one: a new run or chat, a chat handed to
 * another agent, an agent's info. A request about an existing task or chat
 * names it by id, and the proxy cannot tell which app or agent that id
 * belongs to; those calls are limited to the read/stream/answer paths below.
 */

/** Ids of tasks, chats, messages, tool calls, runs and interrupts. */
const ID = "[A-Za-z0-9_-]+";
/** One segment of an agent ref in a path (namespace, name, name@version). */
const SEGMENT = "[A-Za-z0-9._@:-]+";
/** API routes under /agents/{id}/ that are not an agent's namespace/name. */
const AGENT_SUBROUTES = "(?!(?:card|versions|rules)$)";

/** Where a request names the app or agent it runs. */
type RefSource =
    /** Body field naming the app or agent, and fields that would name one another way. */
    | { body: string; refuse: string[] }
    /** `/agents/{namespace}/{name}` in the path. */
    | { path: true };

export interface ProxyEndpoint {
    method: "GET" | "POST";
    /** API path, matched whole. */
    path: RegExp;
    /** What the endpoint is for (used in docs and tests). */
    purpose: string;
    /** Set when the request names an app or agent: checked against allowedEndpoints. */
    ref?: RefSource;
    /** Set when only these body fields may be sent. */
    onlyFields?: string[];
}

const endpoint = (
    method: ProxyEndpoint["method"],
    path: string,
    purpose: string,
    rules: Pick<ProxyEndpoint, "ref" | "onlyFields"> = {}
): ProxyEndpoint => ({ method, path: new RegExp(`^${path}$`), purpose, ...rules });

/**
 * The calls the proxy forwards. Everything else is refused with 403.
 */
export const PROXY_ENDPOINTS: readonly ProxyEndpoint[] = [
    // Apps: run, then follow the task.
    endpoint("POST", "/apps/run", "run an app", { ref: { body: "app", refuse: ["app_id", "version_id"] } }),
    endpoint("POST", "/files", "upload a file input of a run or message"),
    endpoint("GET", `/tasks/${ID}`, "read a task"),
    endpoint("GET", `/tasks/${ID}/status`, "poll a task"),
    endpoint("GET", `/tasks/${ID}/stream`, "stream a task"),
    endpoint("POST", `/tasks/${ID}/cancel`, "cancel a task"),

    // Agents: start or continue a chat.
    endpoint("POST", "/agents/run", "send a message to an agent", { ref: { body: "agent", refuse: ["agent_config"] } }),
    endpoint("POST", "/chats", "start a chat with an agent", { ref: { body: "agent", refuse: [] } }),
    endpoint("POST", `/chats/${ID}/messages`, "send a message in a chat"),
    endpoint("POST", `/chats/${ID}/agent`, "hand a chat to another agent", { ref: { body: "agent", refuse: [] } }),
    endpoint("GET", `/agents/${SEGMENT}/${AGENT_SUBROUTES}${SEGMENT}`, "read an agent's info", { ref: { path: true } }),

    // Agents: follow and steer the chat.
    endpoint("GET", `/chats/${ID}`, "read a chat"),
    endpoint("GET", `/chats/${ID}/status`, "poll a chat"),
    endpoint("GET", `/chats/${ID}/messages`, "read a chat's messages"),
    endpoint("GET", `/chats/${ID}/stream`, "stream a chat"),
    endpoint("POST", `/chats/${ID}/stop`, "stop a chat"),
    endpoint("POST", `/chats/messages/${ID}/cancel`, "cancel a message"),
    endpoint("POST", `/tools/${ID}`, "answer a client tool call"),
    endpoint("POST", `/tools/${ID}/invoke`, "approve a tool call"),
    endpoint("POST", `/tools/${ID}/reject`, "reject a tool call"),
    endpoint("GET", `/chats/${ID}/tools/${ID}/always-allow/options`, "list always-allow options of a tool call"),
    endpoint("POST", `/chats/${ID}/tools/${ID}/always-allow`, "always allow a tool call in this chat"),
    endpoint("POST", `/chats/${ID}/tools/${ID}/explain`, "explain a tool call awaiting approval"),
    // "Allow all tools" in the chat; the chat's other settings (visibility,
    // hooks) stay the owner's.
    endpoint("POST", `/chats/${ID}/settings`, "allow all tool calls in this chat", { onlyFields: ["allow_all_tools"] }),
    endpoint("GET", `/agent-runs/${ID}/interrupts`, "list a run's interrupts"),
    endpoint("POST", `/interrupts/${ID}/resolve`, "resolve an interrupt"),
];

/** A refusal: the HTTP status and the message sent back. */
interface PolicyRefusal {
    status: number;
    error: string;
}

/**
 * `namespace/name` of an app or agent ref, parsed the way the API parses it
 * (`[type/]namespace/name[@version][:function]`), or undefined when the ref
 * names no namespace (an id, or a bare name).
 */
function refName(ref: string): string | undefined {
    let full = ref;
    const colon = ref.lastIndexOf(":");
    const at = ref.lastIndexOf("@");
    if (colon !== -1 && (at === -1 || colon > at)) full = ref.slice(0, colon);
    const versionAt = full.lastIndexOf("@");
    const fullName = versionAt === -1 ? full : full.slice(0, versionAt);

    const parts = fullName.split("/");
    if (parts.length < 2) return undefined;
    let namespace = parts[0];
    let name = parts.slice(1).join("/");
    if (parts.length >= 3 && ["knowledge", "skill", "app", "agent"].includes(parts[0])) {
        namespace = parts[1];
        name = parts.slice(2).join("/");
    }
    if (!namespace || !name) return undefined;
    return `${namespace}/${name}`;
}

/**
 * Compile allowedEndpoints globs. `*` matches within one path segment, so
 * "ana/*" is every app and agent of the namespace "ana".
 */
function compileEndpointPatterns(patterns: readonly string[]): RegExp[] {
    return patterns.map((pattern) => {
        if (typeof pattern !== "string" || refName(pattern) !== pattern) {
            throw new Error(`allowedEndpoints: "${pattern}" is not a namespace/name pattern (e.g. "ana/helper" or "ana/*")`);
        }
        const source = pattern.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*");
        return new RegExp(`^${source}$`);
    });
}

/**
 * Go's encoding/json matches object keys to struct fields case-insensitively
 * (with Unicode folding: "ſ" is "s", "K" is "k"), so the API reads "Agent" or
 * "AGENT" as "agent". Every key that folds to a field is that field.
 */
function foldKey(key: string): string {
    return key.toUpperCase().toLowerCase();
}

function fieldValues(body: Record<string, unknown>, field: string): unknown[] {
    return Object.keys(body).filter((key) => foldKey(key) === field).map((key) => body[key]);
}

/**
 * Check a request against the endpoint list and allowedEndpoints. Returns a
 * refusal, or undefined when the request may be forwarded.
 *
 * @param patterns compiled allowedEndpoints; empty means every app and agent.
 */
function checkProxyRequest(
    method: string,
    pathname: string,
    body: string | undefined,
    patterns: readonly RegExp[]
): PolicyRefusal | undefined {
    const m = method.toUpperCase();
    const match = PROXY_ENDPOINTS.find((e) => e.method === m && e.path.test(pathname));
    if (!match) {
        return {
            status: 403,
            error: `${m} ${pathname} is not available through the inference.sh proxy: it forwards app runs and agent chats only`,
        };
    }
    const checkRef = match.ref !== undefined && patterns.length > 0;
    if (!checkRef && !match.onlyFields) return undefined;

    if (match.ref && "path" in match.ref) {
        const ref = pathname.slice("/agents/".length);
        return allowedRef(ref, patterns) ? undefined : notAllowed(`agent "${ref}"`);
    }

    let json: unknown;
    try {
        json = body ? JSON.parse(body) : undefined;
    } catch {
        return { status: 400, error: "request body must be JSON" };
    }
    if (json === null || typeof json !== "object" || Array.isArray(json)) {
        return { status: 400, error: "request body must be a JSON object" };
    }
    const fields = json as Record<string, unknown>;

    if (match.onlyFields) {
        const extra = Object.keys(fields).find((key) => !match.onlyFields!.includes(foldKey(key)));
        if (extra !== undefined) {
            return { status: 403, error: `"${extra}" cannot be set through the inference.sh proxy` };
        }
    }

    if (checkRef && match.ref && "body" in match.ref) {
        for (const field of match.ref.refuse) {
            if (fieldValues(fields, field).some((v) => v !== null && v !== undefined && v !== "")) {
                return {
                    status: 403,
                    error: `"${field}" is not accepted when allowedEndpoints is set: name the app or agent by its namespace/name ref`,
                };
            }
        }
        const refs = fieldValues(fields, match.ref.body);
        if (refs.length === 0) {
            return { status: 403, error: `"${match.ref.body}" is required when allowedEndpoints is set` };
        }
        const refused = refs.find((ref) => !allowedRef(ref, patterns));
        if (refused !== undefined) return notAllowed(`${match.ref.body} ${JSON.stringify(refused)}`);
    }
    return undefined;
}

function allowedRef(ref: unknown, patterns: readonly RegExp[]): boolean {
    const name = typeof ref === "string" ? refName(ref) : undefined;
    return name !== undefined && patterns.some((p) => p.test(name));
}

function notAllowed(what: string): PolicyRefusal {
    return { status: 403, error: `${what} is not in this proxy's allowedEndpoints` };
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

/** Loopback hosts, where plain http never leaves the machine (local dev). */
function isLoopback(hostname: string): boolean {
    const h = hostname.toLowerCase();
    return h === "localhost"
        || h.endsWith(".localhost")
        || h === "[::1]"
        || /^127(\.\d{1,3}){3}$/.test(h);
}

/**
 * The proxy attaches the site's API key, so the target must be https; plain
 * http is allowed only to a loopback host (a local API in development).
 */
function isAllowedScheme(target: URL): boolean {
    if (target.protocol === "https:") return true;
    return target.protocol === "http:" && isLoopback(target.hostname);
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
export async function processProxyRequest<T, R = unknown>(
    adapter: ProxyAdapter<T, R>,
    options?: ProxyOptions<R>
): Promise<T> {
    // 0. Who may use the key: isAuthenticated when given, else
    // allowUnauthorizedRequests (default true).
    if (options?.isAuthenticated) {
        if (!(await options.isAuthenticated(adapter.request as R))) {
            return adapter.error(401, { error: "Unauthorized" });
        }
    } else if (options?.allowUnauthorizedRequests === false) {
        return adapter.error(401, {
            error: "Unauthorized: this proxy sets allowUnauthorizedRequests: false without isAuthenticated",
        });
    }

    let patterns: RegExp[];
    try {
        patterns = compileEndpointPatterns(options?.allowedEndpoints ?? []);
    } catch (e) {
        return adapter.error(500, { error: (e as Error).message });
    }

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

    // 1b. Parse, and rewrite the base URL if INFERENCE_API_BASE_URL is set
    let target: URL;
    try {
        target = new URL(targetUrl);
        const overrideBase = options?.apiBaseUrl || process.env.INFERENCE_API_BASE_URL;
        if (overrideBase) {
            const override = new URL(overrideBase);
            target.protocol = override.protocol;
            target.host = override.host;
        }
    } catch {
        return adapter.error(400, { error: "Invalid target URL" });
    }
    targetUrl = target.toString();

    // 2. Validate the target: https only (the API key rides on this request),
    // and an inference.sh or explicitly allowed domain.
    if (!isAllowedScheme(target)) {
        return adapter.error(412, {
            error: `Target must use https, got: ${target.protocol}`,
        });
    }

    const host = target.host;
    if (!isAllowedDomain(host, options?.allowedDomains)) {
        return adapter.error(412, {
            error: `Target must be an inference.sh domain, got: ${host}`,
        });
    }

    // 2b. Only the calls a frontend needs to run apps and agents, and only
    // the allowed apps and agents. The body is read once, here, and the same
    // string is what goes upstream.
    const body = adapter.method.toUpperCase() === "GET" ? undefined : await adapter.body();
    const refusal = checkProxyRequest(adapter.method, target.pathname, body, patterns);
    if (refusal) {
        return adapter.error(refusal.status, { error: refusal.error });
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

    // 4. Collect headers to forward upstream.
    //
    // x-inf-* plus the SDK's own headers. X-API-Version is load-bearing: the
    // API returns bare DTOs when it sees "2" and the legacy {success, status,
    // data} envelope otherwise, and this SDK only parses the former. Dropping
    // it here made every proxied response unparseable — requests succeeded
    // server-side while the client silently saw nothing.
    const FORWARD_HEADERS = ["x-api-version", "x-client-source"];
    const forwardHeaders: Record<string, string> = {};
    const allHeaders = adapter.headers();
    for (const [key, value] of Object.entries(allHeaders)) {
        const lower = key.toLowerCase();
        if (lower.startsWith("x-inf-") || FORWARD_HEADERS.includes(lower)) {
            const v = firstValue(value);
            if (v) forwardHeaders[lower] = v;
        }
    }

    // 5. Build request headers
    const contentType = firstValue(adapter.header("content-type"));
    const userAgent = firstValue(adapter.header("user-agent"));
    const proxyId = `@inferencesh/sdk-proxy/${adapter.framework}`;

    // 6. Make upstream request
    const accept = firstValue(adapter.header("accept"));
    const response = await fetch(targetUrl, {
        method: adapter.method,
        headers: {
            ...forwardHeaders,
            authorization: firstValue(adapter.header("authorization")) ?? `Bearer ${apiKey}`,
            accept: accept || "application/json",
            "content-type": contentType || "application/json",
            "user-agent": userAgent || proxyId,
            "x-inf-proxy": proxyId,
        } as HeadersInit,
        body,
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
