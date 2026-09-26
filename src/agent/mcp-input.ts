/**
 * MCP input requests on agent tool invocations.
 *
 * When a remote MCP server answers a tool call with `input_required`, the agent
 * runtime parks the invocation in `awaiting_input` and stores an MCPInputState in
 * its `data`. The UI renders each input request, collects an ElicitResult per
 * key, and submits them with `submitMCPInput`; the runtime then re-sends the
 * tool call with those responses.
 */

import type { ElicitAction, ElicitResult, InputRequest } from '../types';

export const MCPMethodElicitationCreate = 'elicitation/create';

/** Stored in ToolInvocationDTO.data while an MCP tool call waits for the user. */
export interface MCPInputState {
  input_required: true;
  input_requests: Record<string, InputRequest>;
  request_state?: string;
  /** 1 for the first request; goes up each time the server asks again. */
  round: number;
}

/** One property of a form-mode requestedSchema (MCP restricts these to flat primitives). */
export interface ElicitPropertySchema {
  type?: 'string' | 'number' | 'integer' | 'boolean';
  title?: string;
  description?: string;
  default?: unknown;
  format?: 'email' | 'uri' | 'date' | 'date-time' | string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  enumNames?: string[];
  oneOf?: { const: string; title?: string }[];
}

export interface ElicitRequestedSchema {
  type?: 'object';
  properties?: Record<string, ElicitPropertySchema>;
  required?: string[];
}

/** params of an elicitation/create request. */
export interface ElicitRequestParams {
  mode?: 'form' | 'url';
  message: string;
  requestedSchema?: ElicitRequestedSchema;
  url?: string;
}

/** Parses an invocation's data into MCPInputState, or null when it isn't one. */
export function parseMCPInputState(data: unknown): MCPInputState | null {
  let value = data;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<MCPInputState>;
  if (state.input_required !== true) return null;
  if (!state.input_requests || typeof state.input_requests !== 'object') return null;
  if (Object.keys(state.input_requests).length === 0) return null;
  return {
    input_required: true,
    input_requests: state.input_requests,
    request_state: state.request_state,
    round: typeof state.round === 'number' ? state.round : 1,
  };
}

/** Returns the elicitation params of an input request, or null for other methods. */
export function elicitParams(request: InputRequest): ElicitRequestParams | null {
  if (request.method !== MCPMethodElicitationCreate || !request.params) return null;
  const params = request.params as ElicitRequestParams;
  return { ...params, message: params.message ?? '' };
}

/** URL mode sends the user to a page; form mode asks for fields. Mode defaults to form. */
export function isURLElicitation(params: ElicitRequestParams): boolean {
  return params.mode === 'url' || (!params.mode && !!params.url);
}

/** Builds the tool result string the runtime expects: {<key>: {action, content?}}. */
export function buildMCPInputResult(responses: Record<string, ElicitResult>): string {
  const out: Record<string, ElicitResult> = {};
  for (const [key, response] of Object.entries(responses)) {
    out[key] = response.action === 'accept' && response.content
      ? { action: response.action, content: response.content }
      : { action: response.action as ElicitAction };
  }
  return JSON.stringify(out);
}
