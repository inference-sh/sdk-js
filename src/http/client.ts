import { RequirementError } from '../types';
import { InferenceError, RequirementsNotMetException } from './errors';
import type { Response } from './response';
import { EventSource, type FetchLike } from 'eventsource';

/** What a failed request was sent with, for an error handler that acts on it. */
export interface FailedRequest {
  /**
   * The bearer token the request carried, or undefined when it carried none
   * (proxy mode, or no apiKey and getToken returned nothing). A handler that
   * refreshes credentials compares it with the token in hand: when they
   * differ, the credentials were already replaced and a retry is enough.
   */
  token: string | undefined;
}

/**
 * Error handler that can intercept errors and optionally retry the request.
 * Return a promise to retry with a new result, or throw/rethrow to propagate the error.
 * `retry` sends the request again with the token of that moment and does not
 * come back through the handler. `request` describes the attempt that failed.
 */
export type ErrorHandler = (
  error: unknown,
  retry: () => Promise<unknown>,
  request: FailedRequest
) => Promise<unknown>;

/** Options of HttpClient.fetch: a fetch init whose credentials mode is the client's. */
export type HttpFetchInit = Omit<RequestInit, 'headers' | 'credentials'> & {
  headers?: Record<string, string>;
};

export type MessageHandler = (messages: import('../types').ResponseMessage[]) => void;

export interface HttpClientConfig {
  /** Your inference.sh API key (required unless using proxyUrl) */
  apiKey?: string;
  /** Custom API base URL (defaults to https://api.inference.sh) */
  baseUrl?: string;
  /**
   * Proxy URL for frontend apps.
   * When set, requests are routed through your proxy server to protect API keys.
   */
  proxyUrl?: string;
  /**
   * Dynamic token getter (alternative to apiKey), asked before every request.
   * It may be async: the request waits for the token.
   */
  getToken?: () => string | null | undefined | Promise<string | null | undefined>;
  /** Dynamic headers */
  headers?: Record<string, string | (() => string | undefined)>;
  /** Request credentials mode */
  credentials?: RequestCredentials;
  /**
   * Error handler for intercepting and handling request errors.
   * Can be used for retry logic, auth refresh, OTP handling, etc.
   */
  onError?: ErrorHandler;
  /**
   * Callback fired when a successful response includes messages (warnings, info).
   * Use for surfacing concurrency limits, upgrade prompts, deprecation notices, etc.
   */
  onMessage?: MessageHandler;
  /**
   * Use polling instead of SSE for real-time updates (default: true = SSE).
   * Set to false for environments that can't maintain long-lived connections
   * (Convex actions, Cloudflare Workers, restricted edge runtimes).
   */
  stream?: boolean;
  /**
   * Polling interval in milliseconds when stream is false (default: 2000).
   */
  pollIntervalMs?: number;
}

/**
 * Low-level HTTP client for inference.sh API
 *
 * This client handles authentication, proxy mode, and error handling.
 * It's designed to be extended by higher-level API modules.
 */
export class HttpClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly proxyUrl: string | undefined;
  private readonly getToken: HttpClientConfig['getToken'];
  private readonly customHeaders: Record<string, string | (() => string | undefined)>;
  private readonly credentials: RequestCredentials;
  private readonly onError: ErrorHandler | undefined;
  private readonly onMessage: MessageHandler | undefined;
  private readonly streamDefault: boolean;
  private readonly pollInterval: number;

  constructor(config: HttpClientConfig) {
    // Either apiKey, getToken, or proxyUrl must be provided
    if (!config.apiKey && !config.proxyUrl && !config.getToken) {
      throw new Error('Either apiKey, getToken, or proxyUrl is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.inference.sh';
    this.proxyUrl = config.proxyUrl;
    this.getToken = config.getToken;
    this.customHeaders = { 'X-Client-Source': 'inference-sdk-js/0.5.13', ...config.headers };
    // Bearer auth needs no cookies, and 'include' makes browsers reject the
    // response unless the API answers with Allow-Credentials — which it does not
    // for third-party origins (WebKit reports that as "Load failed"). Cookies
    // matter only for the proxy / getToken flows, which keep 'include'.
    this.credentials = config.credentials || (config.apiKey ? 'omit' : 'include');
    this.onError = config.onError;
    this.onMessage = config.onMessage;
    this.streamDefault = config.stream ?? true;
    this.pollInterval = config.pollIntervalMs ?? 2000;
  }

  /** Get the base URL */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** Whether SSE streaming is the default transport (true) or polling (false) */
  getStreamDefault(): boolean {
    return this.streamDefault;
  }

  /** Get the default poll interval in ms */
  getPollIntervalMs(): number {
    return this.pollInterval;
  }

  /** Check if in proxy mode */
  isProxyMode(): boolean {
    return !!this.proxyUrl;
  }

  /** Resolve dynamic headers */
  private resolveHeaders(): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.customHeaders)) {
      const val = typeof value === 'function' ? value() : value;
      if (val !== undefined) {
        resolved[key] = val;
      }
    }
    return resolved;
  }

  /** The bearer token a request sent now carries; none through a proxy, which adds its own. */
  private async bearerToken(): Promise<string | undefined> {
    if (this.proxyUrl) return undefined;
    return (this.getToken ? await this.getToken() : this.apiKey) || undefined;
  }

  /** The configured headers plus what identifies the request: its bearer, or through a proxy its target. */
  private requestHeaders(targetUrl: URL, token: string | undefined): Record<string, string> {
    const headers = this.resolveHeaders();
    if (this.proxyUrl) {
      headers['x-inf-target-url'] = targetUrl.toString();
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Where a request whose caller cannot set headers (EventSource) or reads
   * the URL (streams) goes: the API, or the proxy with the target as a query
   * parameter.
   */
  private streamUrl(targetUrl: URL): string {
    if (!this.proxyUrl) return targetUrl.toString();
    const proxyUrlWithQuery = new URL(this.proxyUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    proxyUrlWithQuery.searchParams.set('__inf_target', targetUrl.toString());
    return proxyUrlWithQuery.toString();
  }

  /**
   * Make an HTTP request to the API
   */
  async request<T, P extends object = Record<string, unknown>>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    {
      handleErrors = true,
      ...options
    }: {
      params?: P;
      data?: unknown;
      /**
       * `false` when the caller handles this request's failure itself: the
       * client's error handler (onError) is not consulted, so there is no
       * prompt, no redirect and no retry, and the error is thrown as it is.
       */
      handleErrors?: boolean;
    } = {}
  ): Promise<Response<T>> {
    const send = (token: string | undefined) => this.executeRequest<T, P>(method, endpoint, options, token);

    const token = await this.bearerToken();
    try {
      return await send(token);
    } catch (error) {
      if (this.onError && handleErrors) {
        return await this.onError(error, async () => send(await this.bearerToken()), { token }) as Response<T>;
      }
      throw error;
    }
  }

  /**
   * Fetch an API endpoint with the client's auth, headers and credentials
   * mode and resolve with the raw response, for bodies request() does not
   * parse (streams, text). A failure goes through onError like one of
   * request() does: a refused response, or a request that got no response.
   * It resolves with the response onError's retry got; when onError resolves
   * with anything else the failure stands and is thrown, the error request()
   * would throw. A request aborted through `init.signal` rejects with the
   * abort and is not an error for onError.
   */
  async fetch(endpoint: string, init: HttpFetchInit = {}): Promise<globalThis.Response> {
    const targetUrl = new URL(`${this.baseUrl}${endpoint}`);
    const response = await this.fetchHandled(this.streamUrl(targetUrl), targetUrl, init, 'throw');
    // What onError's retry got is handed over unread, and can be a refusal too.
    if (!response.ok) throw await this.readError(response);
    return response;
  }

  /**
   * One fetch of `url` on behalf of `targetUrl`. A refused response, or a
   * request that got none, goes to onError; the result is the response its
   * retry got. Without one the failure stands: the error of a request that
   * got no response is thrown, and a refusal is thrown as the error its body
   * was read into or, for a caller that passes the response on
   * (`refused: 'return'`), handed back with its body unread.
   */
  private async fetchHandled(
    url: string | URL,
    targetUrl: URL,
    init: HttpFetchInit,
    refused: 'throw' | 'return'
  ): Promise<globalThis.Response> {
    const send = (token: string | undefined) => fetch(url, {
      ...init,
      headers: { ...init.headers, ...this.requestHeaders(targetUrl, token) },
      credentials: this.credentials,
    });
    const retry = async () => send(await this.bearerToken());

    const token = await this.bearerToken();
    let response: globalThis.Response;
    try {
      response = await send(token);
    } catch (error) {
      // The caller aborted the request; nothing failed.
      if (!this.onError || init.signal?.aborted) throw error;
      const handled = await this.onError(error, retry, { token });
      if (handled instanceof globalThis.Response) return handled;
      throw error;
    }
    if (response.ok || (refused === 'return' && !this.onError)) return response;
    // The body is read once: from a clone only when the response is handed back.
    const error = await this.readError(refused === 'return' ? response.clone() : response);
    const handled = await this.onError?.(error, retry, { token });
    if (handled instanceof globalThis.Response) return handled;
    if (refused === 'return') return response;
    throw error;
  }

  /** The error a refused response stands for, read from its body. */
  private async readError(response: globalThis.Response): Promise<Error> {
    const responseText = await response.text().catch(() => '');
    let data: unknown = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Not JSON
    }
    return this.responseError(response.status, responseText, data);
  }

  /** HTTP errors → RFC 9457 problem+json */
  private responseError(status: number, responseText: string, data: unknown): Error {
    if (status === 412 && data && typeof data === 'object' && 'errors' in data && Array.isArray(data.errors)) {
      return RequirementsNotMetException.fromResponse(data as { errors: RequirementError[] }, status);
    }

    let errorDetail: string | undefined;
    if (data && typeof data === 'object') {
      errorDetail = this.extractErrorDetail(data) ?? JSON.stringify(data);
    } else if (responseText) {
      errorDetail = responseText.slice(0, 500);
    }

    return new InferenceError(status, errorDetail || 'Request failed', responseText);
  }

  /**
   * Execute the actual HTTP request (internal)
   */
  private async executeRequest<T, P extends object = Record<string, unknown>>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    options: {
      params?: P;
      data?: unknown;
    },
    token: string | undefined
  ): Promise<Response<T>> {
    // Build the target URL (always points to the API)
    const targetUrl = new URL(`${this.baseUrl}${endpoint}`);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Serialize arrays and objects as JSON, primitives as strings
          const serialized = typeof value === 'object' ? JSON.stringify(value) : String(value);
          targetUrl.searchParams.append(key, serialized);
        }
      });
    }

    // In proxy mode, requests go to the proxy with target URL in a header
    const fetchUrl = this.proxyUrl ?? targetUrl.toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.requestHeaders(targetUrl, token),
    };

    const fetchOptions: RequestInit = {
      method: method.toUpperCase(),
      headers,
      credentials: this.credentials,
    };

    if (options.data) {
      fetchOptions.body = JSON.stringify(options.data);
    }

    const response = await fetch(fetchUrl, fetchOptions);
    const responseText = await response.text();

    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Not JSON
    }

    if (!response.ok) {
      throw this.responseError(response.status, responseText, data);
    }

    if (response.status === 204 || !responseText) {
      return { data: undefined as T, messages: [] };
    }

    // Unwrap V3 envelope: {"data": <dto>, "messages": [...]}
    if (data && typeof data === 'object' && 'data' in data && !Array.isArray(data)) {
      const messages = data.messages ?? [];
      if (this.onMessage && messages.length) {
        this.onMessage(messages);
      }
      return { data: data.data as T, messages };
    }

    return { data: data as T, messages: [] };
  }

  /**
   * Get URL and headers for NDJSON streaming.
   * Returns the full URL and auth headers needed for streamable requests.
   * It answers synchronously, so it throws when getToken is async.
   * @deprecated Use fetch(), or a StreamRequest built on it
   * (`(init) => http.fetch(endpoint, init)`): a request made from this config
   * bypasses onError and carries the token of the moment the config was read.
   */
  getStreamableConfig(endpoint: string): { url: string; headers: Record<string, string>; credentials: RequestCredentials } {
    const targetUrl = new URL(`${this.baseUrl}${endpoint}`);
    const token = this.proxyUrl ? undefined : this.getToken ? this.getToken() : this.apiKey;
    if (token instanceof Promise) {
      throw new Error('getStreamableConfig() cannot wait for an async getToken; use fetch() instead');
    }
    return {
      url: this.streamUrl(targetUrl),
      headers: this.requestHeaders(targetUrl, token || undefined),
      credentials: this.credentials,
    };
  }

  /**
   * Pull a human-readable detail string from a parsed problem+json / API error
   * body (RFC 9457 `detail`/`title`, or a plain `message`).
   */
  private extractErrorDetail(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const d = data as Record<string, unknown>;
    return (d.detail || d.title || d.message) as string | undefined;
  }

  /**
   * Create an EventSource for SSE streaming
   * @deprecated Use StreamableManager with a StreamRequest instead
   */
  createEventSource(endpoint: string): Promise<EventSource | null> {
    const targetUrl = new URL(`${this.baseUrl}${endpoint}`);

    // The EventSource error event omits the response body, so a failed initial
    // connection (e.g. 403 otp_required) is handled here in the fetch wrapper:
    // route it through onError like request() does, and hand the retried
    // response (e.g. after OTP verification) back so the stream connects.
    const doFetch: FetchLike = (input, init) =>
      this.fetchHandled(input, targetUrl, init ?? {}, 'return') as ReturnType<FetchLike>;

    return Promise.resolve(new EventSource(this.streamUrl(targetUrl), { fetch: doFetch }));
  }
}

/**
 * Create an HTTP client instance
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}
