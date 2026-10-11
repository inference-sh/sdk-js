import type { ResponseMessage } from '../types.js';

/**
 * Response wraps the V3 API envelope — every API call returns this.
 * Access .data for the DTO and .messages for any warnings the server surfaced.
 */
export interface Response<T> {
  data: T;
  messages: ResponseMessage[];
}
