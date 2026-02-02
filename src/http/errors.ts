/**
 * Error classes for the inference.sh SDK.
 * 
 * Note: types.ts contains interfaces (APIError, RequirementsNotMetError) that describe
 * the API response data shapes. These classes are throwable Error subclasses for SDK use.
 */

import type { RequirementError } from '../types';

/**
 * General HTTP/API error thrown by the SDK.
 * 
 * Note: This is distinct from the `APIError` interface in types.ts which describes
 * the error payload shape in API responses.
 */
export class InferenceError extends Error {
  readonly statusCode: number;
  readonly responseBody?: string;

  constructor(statusCode: number, message: string, responseBody?: string) {
    super(`HTTP ${statusCode}: ${message}`);
    this.name = 'InferenceError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Error thrown when app requirements (secrets, integrations, scopes) are not met.
 *
 * Thrown for HTTP 412 responses that contain structured requirement errors.
 *
 * @example
 * ```typescript
 * try {
 *   const task = await client.run(params);
 * } catch (e) {
 *   if (e instanceof RequirementsNotMetException) {
 *     for (const err of e.errors) {
 *       console.log(`Missing ${err.type}: ${err.key}`);
 *       if (err.action) {
 *         console.log(`  Fix: ${err.action.type}`);
 *       }
 *     }
 *   }
 * }
 * ```
 */
export class RequirementsNotMetException extends Error {
  readonly errors: RequirementError[];
  readonly statusCode: number;

  constructor(errors: RequirementError[], statusCode: number = 412) {
    const message = errors.length > 0 ? errors[0].message : 'requirements not met';
    super(message);
    this.name = 'RequirementsNotMetException';
    this.errors = errors;
    this.statusCode = statusCode;
  }

  /**
   * Create from API response data.
   */
  static fromResponse(data: { errors?: RequirementError[] }, statusCode: number = 412): RequirementsNotMetException {
    return new RequirementsNotMetException(data.errors || [], statusCode);
  }
}

// Session-specific errors

/**
 * Base class for session-related errors.
 */
export class SessionError extends InferenceError {
  readonly sessionId: string;

  constructor(sessionId: string, statusCode: number, message: string, responseBody?: string) {
    super(statusCode, message, responseBody);
    this.name = 'SessionError';
    this.sessionId = sessionId;
  }
}

/**
 * Error thrown when a session doesn't exist (404 SESSION_NOT_FOUND).
 *
 * @example
 * ```typescript
 * try {
 *   await client.sessions.get('sess_invalid');
 * } catch (e) {
 *   if (e instanceof SessionNotFoundError) {
 *     console.log('Session not found');
 *   }
 * }
 * ```
 */
export class SessionNotFoundError extends SessionError {
  constructor(sessionId: string, responseBody?: string) {
    super(sessionId, 404, `Session not found: ${sessionId}`, responseBody);
    this.name = 'SessionNotFoundError';
  }
}

/**
 * Error thrown when a session has expired (410 SESSION_EXPIRED).
 *
 * Sessions expire after an idle timeout (default: 5 minutes).
 *
 * @example
 * ```typescript
 * try {
 *   const result = await client.run({ ..., session: sessionId });
 * } catch (e) {
 *   if (e instanceof SessionExpiredError) {
 *     // Create new session
 *     const result = await client.run({ ..., session: 'new' });
 *   }
 * }
 * ```
 */
export class SessionExpiredError extends SessionError {
  constructor(sessionId: string, responseBody?: string) {
    super(sessionId, 410, `Session expired: ${sessionId}`, responseBody);
    this.name = 'SessionExpiredError';
  }
}

/**
 * Error thrown when a session was explicitly ended (410 SESSION_ENDED).
 *
 * @example
 * ```typescript
 * try {
 *   const result = await client.run({ ..., session: sessionId });
 * } catch (e) {
 *   if (e instanceof SessionEndedError) {
 *     // Create new session
 *     const result = await client.run({ ..., session: 'new' });
 *   }
 * }
 * ```
 */
export class SessionEndedError extends SessionError {
  constructor(sessionId: string, responseBody?: string) {
    super(sessionId, 410, `Session ended: ${sessionId}`, responseBody);
    this.name = 'SessionEndedError';
  }
}

/**
 * Error thrown when the worker assigned to a session is lost.
 *
 * This can happen if the worker crashes or is terminated unexpectedly.
 *
 * @example
 * ```typescript
 * try {
 *   const result = await client.run({ ..., session: sessionId });
 * } catch (e) {
 *   if (e instanceof WorkerLostError) {
 *     // Worker crashed, create new session
 *     const result = await client.run({ ..., session: 'new' });
 *   }
 * }
 * ```
 */
export class WorkerLostError extends SessionError {
  constructor(sessionId: string, responseBody?: string) {
    super(sessionId, 500, `Worker lost for session: ${sessionId}`, responseBody);
    this.name = 'WorkerLostError';
  }
}

