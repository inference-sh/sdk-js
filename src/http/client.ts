import { APIResponse, RequirementError } from '../types';
import { InferenceError, RequirementsNotMetException } from './errors';
import { EventSource } from 'eventsource';

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
  /** Dynamic token getter (alternative to apiKey) */
  getToken?: () => string | null | undefined;
  /** Dynamic headers */
  headers?: Record<string, string | (() => string | undefined)>;
  /** Request credentials mode */
  credentials?: RequestCredentials;
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
  private readonly getToken: (() => string | null | undefined) | undefined;
  private readonly customHeaders: Record<string, string | (() => string | undefined)>;
  private readonly credentials: RequestCredentials;

  constructor(config: HttpClientConfig) {
    // Either apiKey, getToken, or proxyUrl must be provided
    if (!config.apiKey && !config.proxyUrl && !config.getToken) {
      throw new Error('Either apiKey, getToken, or proxyUrl is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.inference.sh';
    this.proxyUrl = config.proxyUrl;
    this.getToken = config.getToken;
    this.customHeaders = config.headers || {};
    this.credentials = config.credentials || 'include';
  }

  /** Get the base URL */
  getBaseUrl(): string {
    return this.baseUrl;
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

  /** Get authorization token */
  private getAuthToken(): string | null | undefined {
    if (this.getToken) {
      return this.getToken();
    }
    return this.apiKey;
  }

  /**
   * Make an HTTP request to the API
   */
  async request<T, P extends object = Record<string, unknown>>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    options: {
      params?: P;
      data?: unknown;
    } = {}
  ): Promise<T> {
    // Build the target URL (always points to the API)
    const targetUrl = new URL(`${this.baseUrl}${endpoint}`);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          targetUrl.searchParams.append(key, String(value));
        }
      });
    }

    // In proxy mode, requests go to the proxy with target URL in a header
    const isProxyMode = !!this.proxyUrl;
    const fetchUrl = isProxyMode ? this.proxyUrl! : targetUrl.toString();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.resolveHeaders(),
    };

    if (isProxyMode) {
      // Proxy mode: send target URL as header, no auth (proxy handles it)
      headers['x-inf-target-url'] = targetUrl.toString();
    } else {
      // Direct mode: include authorization header
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

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

    // Try to parse as JSON
    let data: APIResponse<T> | { errors?: RequirementError[] } | null = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      // Not JSON
    }

    // Check for HTTP errors
    if (!response.ok) {
      // Check for RequirementsNotMetException (412 with errors array)
      if (response.status === 412 && data && 'errors' in data && Array.isArray(data.errors)) {
        throw RequirementsNotMetException.fromResponse(data as { errors: RequirementError[] }, response.status);
      }

      // General error handling
      let errorDetail: string | undefined;
      if (data && typeof data === 'object') {
        const apiData = data as APIResponse<T>;
        if (apiData.error) {
          errorDetail = typeof apiData.error === 'object' ? apiData.error.message : String(apiData.error);
        } else if ('message' in data) {
          errorDetail = String((data as { message: string }).message);
        } else {
          errorDetail = JSON.stringify(data);
        }
      } else if (responseText) {
        errorDetail = responseText.slice(0, 500);
      }

      throw new InferenceError(response.status, errorDetail || 'Request failed', responseText);
    }

    const apiResponse = data as APIResponse<T>;
    if (!apiResponse?.success) {
      let errorMessage = apiResponse?.error?.message;
      if (!errorMessage) {
        errorMessage = `Request failed (success=false). Response: ${responseText.slice(0, 500)}`;
      }
      throw new InferenceError(response.status, errorMessage, responseText);
    }

    return apiResponse.data as T;
  }

  /**
   * Create an EventSource for SSE streaming
   */
  createEventSource(endpoint: string): Promise<EventSource | null> {
    const targetUrl = new URL(`${this.baseUrl}${endpoint}`);
    const isProxyMode = !!this.proxyUrl;

    // For proxy mode: Browser EventSource can't send custom headers,
    // so append target URL as query param instead
    let fetchUrl: string;
    if (isProxyMode) {
      const proxyUrlWithQuery = new URL(this.proxyUrl!, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      proxyUrlWithQuery.searchParams.set('__inf_target', targetUrl.toString());
      fetchUrl = proxyUrlWithQuery.toString();
    } else {
      fetchUrl = targetUrl.toString();
    }

    const resolvedHeaders = this.resolveHeaders();

    return Promise.resolve(new EventSource(fetchUrl, {
      fetch: (input, init) => {
        const headers: Record<string, string> = {
          ...(init?.headers as Record<string, string>),
          ...resolvedHeaders,
        };

        if (isProxyMode) {
          // Proxy mode: also send target URL as header (for non-browser clients)
          headers['x-inf-target-url'] = targetUrl.toString();
        } else {
          // Direct mode: include authorization header
          const token = this.getAuthToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
        }

        return fetch(input, {
          ...init,
          headers,
          credentials: this.credentials,
        });
      },
    }));
  }
}

/**
 * Create an HTTP client instance
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}
