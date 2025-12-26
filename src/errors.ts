/**
 * Error classes for the inference.sh SDK.
 * 
 * Note: types.ts contains interfaces (APIError, RequirementsNotMetError) that describe
 * the API response data shapes. These classes are throwable Error subclasses for SDK use.
 */

import type { RequirementError } from './types';

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

