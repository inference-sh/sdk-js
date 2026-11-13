/**
 * MCP input requests on agent tool invocations.
 *
 * When a remote MCP server answers a tool call with `input_required`, the agent
 * runtime parks the invocation in `awaiting_input` and stores an MCPInputState in
 * its `data`. The UI renders each input request, collects an ElicitResult per
 * key, and submits them with `submitMCPInput`; the runtime then re-sends the
 * tool call with those responses.
 */

import type { ElicitAction, ElicitResult, InputRequest } from '../types.js';

export const MCPMethodElicitationCreate = 'elicitation/create';

/** Stored in ToolInvocationDTO.data while an MCP tool call waits for the user. */
export interface MCPInputState {
  input_required: true;
  input_requests: Record<string, InputRequest>;
  request_state?: string;
  /** 1 for the first request; goes up each time the server asks again. */
  round: number;
}

/** A choice of a single- or multi-select property: its value and label. */
export interface ElicitChoice {
  const: string;
  title?: string;
  /** Not in MCP's schema; agents' questions carry one per choice. */
  description?: string;
}

/**
 * One property of a form-mode requestedSchema. MCP restricts these to flat
 * primitives, single-select strings (enum or oneOf) and, since 2025-11-25,
 * multi-select arrays whose items are an enum or anyOf.
 */
export interface ElicitPropertySchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array';
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
  oneOf?: ElicitChoice[];
  /** A multi-select's choices (type array). */
  items?: { type?: 'string'; enum?: string[]; anyOf?: ElicitChoice[] };
  minItems?: number;
  maxItems?: number;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : undefined;
}

function choiceArray(value: unknown): ElicitChoice[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((c): c is ElicitChoice => isRecord(c) && typeof c.const === 'string');
}

/** Sets key to value, or removes it when value is undefined. */
function setOrDrop(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value === undefined) Reflect.deleteProperty(target, key);
  else target[key] = value;
}

function cleanProperty(raw: Record<string, unknown>): ElicitPropertySchema {
  const property: Record<string, unknown> = { ...raw };
  if ('enum' in property) setOrDrop(property, 'enum', stringArray(property.enum));
  if ('enumNames' in property) setOrDrop(property, 'enumNames', stringArray(property.enumNames));
  if ('oneOf' in property) setOrDrop(property, 'oneOf', choiceArray(property.oneOf));
  if ('items' in property) {
    if (isRecord(property.items)) {
      const items: Record<string, unknown> = { ...property.items };
      if ('enum' in items) setOrDrop(items, 'enum', stringArray(items.enum));
      if ('anyOf' in items) setOrDrop(items, 'anyOf', choiceArray(items.anyOf));
      property.items = items;
    } else {
      delete property.items;
    }
  }
  return property as ElicitPropertySchema;
}

/**
 * The schema comes from the MCP server as it sent it. Whatever does not have
 * the shape ElicitRequestedSchema declares is dropped, so a consumer can
 * iterate properties, required and each property's choices without checking.
 */
function cleanRequestedSchema(raw: unknown): ElicitRequestedSchema | undefined {
  if (!isRecord(raw)) return undefined;
  const schema: Record<string, unknown> = { ...raw };
  if ('properties' in schema) {
    if (isRecord(schema.properties)) {
      const properties: Record<string, ElicitPropertySchema> = {};
      for (const [name, property] of Object.entries(schema.properties)) {
        if (isRecord(property)) properties[name] = cleanProperty(property);
      }
      schema.properties = properties;
    } else {
      delete schema.properties;
    }
  }
  if ('required' in schema) setOrDrop(schema, 'required', stringArray(schema.required));
  return schema as ElicitRequestedSchema;
}

/**
 * Returns the elicitation params of an input request, or null for other
 * methods and for params that are not an object. The fields are the server's:
 * a message or url that is not a string, and the parts of requestedSchema that
 * do not have the declared shape, are dropped.
 */
export function elicitParams(request: InputRequest): ElicitRequestParams | null {
  if (request.method !== MCPMethodElicitationCreate || !isRecord(request.params)) return null;
  const params: Record<string, unknown> = { ...request.params };
  params.message = typeof params.message === 'string' ? params.message : '';
  if ('url' in params && typeof params.url !== 'string') delete params.url;
  if ('requestedSchema' in params) setOrDrop(params, 'requestedSchema', cleanRequestedSchema(params.requestedSchema));
  return params as unknown as ElicitRequestParams;
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
