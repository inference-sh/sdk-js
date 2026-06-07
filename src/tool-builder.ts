/**
 * Tool Builder - Fluent API for defining agent tools
 */

import { AgentTool, InternalToolsConfig, ToolTypeClient, ToolTypeApp, ToolTypeAgent, ToolTypeHook } from './types';

// =============================================================================
// Client Tool Types
// =============================================================================

/** Handler function for client tools (executed in browser/Node) */
export type ClientToolHandler = (args: Record<string, unknown>) => Promise<string> | string;

/** Client tool with schema and handler bundled together */
export interface ClientTool {
  /** Tool schema (sent to server, describes the tool to the LLM) */
  schema: AgentTool;
  /** Handler function (executed locally when agent invokes the tool) */
  handler: ClientToolHandler;
}

// =============================================================================
// Schema Types
// =============================================================================

type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

interface ParamSchema {
  type: JsonSchemaType;
  description?: string;
  optional?: boolean;
  enum?: string[];
  properties?: Record<string, ParamSchema>;
  items?: ParamSchema;
}

// =============================================================================
// Schema Builders
// =============================================================================

export const string = (description?: string): ParamSchema => ({ type: 'string', description });
export const number = (description?: string): ParamSchema => ({ type: 'number', description });
export const integer = (description?: string): ParamSchema => ({ type: 'integer', description });
export const boolean = (description?: string): ParamSchema => ({ type: 'boolean', description });
export const enumOf = (values: string[], description?: string): ParamSchema => ({ type: 'string', enum: values, description });
export const object = (properties: Record<string, ParamSchema>, description?: string): ParamSchema => ({ type: 'object', properties, description });
export const array = (items: ParamSchema, description?: string): ParamSchema => ({ type: 'array', items, description });
export const optional = <T extends ParamSchema>(schema: T): T & { optional: true } => ({ ...schema, optional: true });

// =============================================================================
// JSON Schema Generator
// =============================================================================

function toJsonSchema(params: Record<string, ParamSchema>): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  
  for (const [key, schema] of Object.entries(params)) {
    const prop: Record<string, unknown> = { type: schema.type };
    if (schema.description) prop.description = schema.description;
    if (schema.enum) prop.enum = schema.enum;
    if (schema.properties) {
      const nested = toJsonSchema(schema.properties as Record<string, ParamSchema>);
      prop.properties = nested.properties;
      if ((nested.required as string[]).length > 0) prop.required = nested.required;
    }
    if (schema.items) {
      const itemSchema = toJsonSchema({ _item: schema.items as ParamSchema });
      prop.items = (itemSchema.properties as Record<string, unknown>)['_item'];
    }
    properties[key] = prop;
    if (!schema.optional) required.push(key);
  }
  
  return { type: 'object', properties, required };
}

// =============================================================================
// Tool Builders
// =============================================================================

class ToolBuilder {
  protected name: string;
  protected desc = '';
  protected displayNameValue?: string;
  protected params: Record<string, ParamSchema> = {};
  protected approval = false;

  constructor(name: string) {
    this.name = name;
  }

  describe(description: string): this {
    this.desc = description;
    return this;
  }

  /** @deprecated Use displayName() instead */
  display(name: string): this {
    this.displayNameValue = name;
    return this;
  }

  displayName(name: string): this {
    this.displayNameValue = name;
    return this;
  }

  param(name: string, schema: ParamSchema): this {
    this.params[name] = schema;
    return this;
  }

  requireApproval(): this {
    this.approval = true;
    return this;
  }
}

class ClientToolBuilder extends ToolBuilder {
  /** Build schema only (use .handler() to include handler) */
  build(): AgentTool {
    return {
      name: this.name,
      display_name: this.displayNameValue || this.name,
      description: this.desc,
      type: ToolTypeClient,
      require_approval: this.approval || undefined,
      client: { input_schema: toJsonSchema(this.params) },
    };
  }

  /** Define handler and return ClientTool (schema + handler) */
  handler(fn: ClientToolHandler): ClientTool {
    return {
      schema: this.build(),
      handler: fn,
    };
  }
}

class AppToolBuilder extends ToolBuilder {
  private appRef: string;
  private setupValues?: Record<string, unknown>;
  private inputValues?: Record<string, unknown>;
  private functionName?: string;
  private sessionEnabledValue = false;

  constructor(name: string, appRef: string) {
    super(name);
    this.appRef = appRef;
  }

  /** Set one-time setup values (hidden from agent, passed on every call) */
  setup(values: Record<string, unknown>): this {
    this.setupValues = values;
    return this;
  }

  /** Set default input values (agent can override these) */
  input(values: Record<string, unknown>): this {
    this.inputValues = values;
    return this;
  }

  /** Set which function to call on multi-function apps */
  function(name: string): this {
    this.functionName = name;
    return this;
  }

  /** Enable session support (agent can pass session parameter and sees session_id in output) */
  sessionEnabled(): this {
    this.sessionEnabledValue = true;
    return this;
  }

  build(): AgentTool {
    return {
      name: this.name,
      display_name: this.displayNameValue || this.name,
      description: this.desc,
      type: ToolTypeApp,
      require_approval: this.approval || undefined,
      app: {
        ref: this.appRef,
        function: this.functionName,
        session_enabled: this.sessionEnabledValue || undefined,
        setup: this.setupValues,
        input: this.inputValues,
      },
    };
  }
}

class AgentToolBuilder extends ToolBuilder {
  private agentRef: string;

  constructor(name: string, agentRef: string) {
    super(name);
    this.agentRef = agentRef;
  }

  build(): AgentTool {
    return {
      name: this.name,
      display_name: this.displayNameValue || this.name,
      description: this.desc,
      type: ToolTypeAgent,
      require_approval: this.approval || undefined,
      agent: { ref: this.agentRef },
    };
  }
}

class WebhookToolBuilder extends ToolBuilder {
  private url: string;
  private secretKey?: string;

  constructor(name: string, url: string) {
    super(name);
    this.url = url;
  }

  secret(key: string): this {
    this.secretKey = key;
    return this;
  }

  build(): AgentTool {
    return {
      name: this.name,
      display_name: this.displayNameValue || this.name,
      description: this.desc,
      type: ToolTypeHook,
      require_approval: this.approval || undefined,
      hook: { url: this.url, secret: this.secretKey, input_schema: toJsonSchema(this.params) },
    };
  }
}

// =============================================================================
// Public API
// =============================================================================

/** Create a client tool (executed by SDK consumer) */
export const tool = (name: string) => new ClientToolBuilder(name);

/** Create an app tool (runs another inference app) */
export const appTool = (name: string, appRef: string) => new AppToolBuilder(name, appRef);

/** Create an agent tool (delegates to sub-agent) */
export const agentTool = (name: string, agentRef: string) => new AgentToolBuilder(name, agentRef);

/** Create a webhook tool (calls external URL) */
export const webhookTool = (name: string, url: string) => new WebhookToolBuilder(name, url);

// =============================================================================
// Internal Tools Builder
// =============================================================================

class InternalToolsBuilder {
  private config: InternalToolsConfig = {};

  /** Enable plan tools (Create, Update, Load) */
  plan(enabled = true): this {
    this.config.plan = enabled;
    return this;
  }

  /** Enable memory tools (Set, Get, GetAll) */
  memory(enabled = true): this {
    this.config.memory = enabled;
    return this;
  }

  /** Enable widget tools (UI, HTML) - top-level only */
  widget(enabled = true): this {
    this.config.widget = enabled;
    return this;
  }

  /** Enable finish tool - sub-agents only */
  finish(enabled = true): this {
    this.config.finish = enabled;
    return this;
  }

  /** Enable all internal tools */
  all(): this {
    this.config.plan = true;
    this.config.memory = true;
    this.config.widget = true;
    this.config.finish = true;
    return this;
  }

  /** Disable all internal tools */
  none(): this {
    this.config.plan = false;
    this.config.memory = false;
    this.config.widget = false;
    this.config.finish = false;
    return this;
  }

  build(): InternalToolsConfig {
    return this.config;
  }
}

/** Create internal tools configuration */
export const internalTools = () => new InternalToolsBuilder();

