/**
 * Sessions API - namespaced session operations.
 */

import { HttpClient } from '../http/client';
import { AppSession } from '../types';

/**
 * Sessions API for managing stateful worker leases.
 *
 * @example
 * ```typescript
 * const client = new Inference({ apiKey: '...' });
 *
 * // Get session info
 * const info = await client.sessions.get('sess_abc123');
 * console.log(info.status);
 *
 * // List sessions
 * const sessions = await client.sessions.list();
 *
 * // Keep session alive
 * await client.sessions.keepalive('sess_abc123');
 *
 * // End session
 * await client.sessions.end('sess_abc123');
 * ```
 */
export class SessionsAPI {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get information about a session.
   *
   * @param sessionId - The session ID
   * @returns Session information
   * @throws SessionNotFoundError if session doesn't exist
   */
  async get(sessionId: string): Promise<AppSession> {
    return this.http.request<AppSession>('get', `/sessions/${sessionId}`);
  }

  /**
   * List all sessions for the current user/team.
   *
   * @returns List of session information
   */
  async list(): Promise<AppSession[]> {
    const data = await this.http.request<AppSession[]>('get', '/sessions');
    return data || [];
  }

  /**
   * Extend session expiration time.
   *
   * Each call resets the expiration timer (sliding window).
   *
   * @param sessionId - The session ID
   * @returns Updated session information
   * @throws SessionNotFoundError if session doesn't exist
   * @throws SessionExpiredError if session has expired
   * @throws SessionEndedError if session was ended
   */
  async keepalive(sessionId: string): Promise<AppSession> {
    return this.http.request<AppSession>('post', `/sessions/${sessionId}/keepalive`);
  }

  /**
   * End a session and release the worker.
   *
   * @param sessionId - The session ID
   * @throws SessionNotFoundError if session doesn't exist
   */
  async end(sessionId: string): Promise<void> {
    await this.http.request<void>('delete', `/sessions/${sessionId}`);
  }
}

/**
 * Create a new SessionsAPI instance.
 */
export function createSessionsAPI(http: HttpClient): SessionsAPI {
  return new SessionsAPI(http);
}
