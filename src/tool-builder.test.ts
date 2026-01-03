import {
  tool,
  appTool,
  agentTool,
  webhookTool,
  internalTools,
  string,
  number,
  integer,
  boolean,
  enumOf,
  object,
  array,
  optional,
} from './tool-builder';
import { ToolTypeClient, ToolTypeApp, ToolTypeAgent, ToolTypeHook } from './types';

describe('Schema Helpers', () => {
  describe('string', () => {
    it('creates string schema without description', () => {
      const schema = string();
      expect(schema).toEqual({ type: 'string' });
    });

    it('creates string schema with description', () => {
      const schema = string('User name');
      expect(schema).toEqual({ type: 'string', description: 'User name' });
    });
  });

  describe('number', () => {
    it('creates number schema', () => {
      expect(number()).toEqual({ type: 'number' });
      expect(number('Temperature')).toEqual({ type: 'number', description: 'Temperature' });
    });
  });

  describe('integer', () => {
    it('creates integer schema', () => {
      expect(integer()).toEqual({ type: 'integer' });
      expect(integer('Age')).toEqual({ type: 'integer', description: 'Age' });
    });
  });

  describe('boolean', () => {
    it('creates boolean schema', () => {
      expect(boolean()).toEqual({ type: 'boolean' });
      expect(boolean('Is active')).toEqual({ type: 'boolean', description: 'Is active' });
    });
  });

  describe('enumOf', () => {
    it('creates enum schema', () => {
      const schema = enumOf(['low', 'medium', 'high']);
      expect(schema).toEqual({ type: 'string', enum: ['low', 'medium', 'high'] });
    });

    it('creates enum schema with description', () => {
      const schema = enumOf(['a', 'b'], 'Priority level');
      expect(schema).toEqual({ type: 'string', enum: ['a', 'b'], description: 'Priority level' });
    });
  });

  describe('object', () => {
    it('creates object schema with nested properties', () => {
      const schema = object({
        name: string('Name'),
        age: integer('Age'),
      });
      expect(schema).toEqual({
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name' },
          age: { type: 'integer', description: 'Age' },
        },
      });
    });

    it('creates object schema with description', () => {
      const schema = object({ x: number() }, 'Coordinates');
      expect(schema.description).toBe('Coordinates');
    });
  });

  describe('array', () => {
    it('creates array schema', () => {
      const schema = array(string('Tag'));
      expect(schema).toEqual({
        type: 'array',
        items: { type: 'string', description: 'Tag' },
      });
    });

    it('creates array schema with description', () => {
      const schema = array(integer(), 'List of IDs');
      expect(schema).toEqual({
        type: 'array',
        items: { type: 'integer' },
        description: 'List of IDs',
      });
    });
  });

  describe('optional', () => {
    it('marks schema as optional', () => {
      const schema = optional(string('Optional field'));
      expect(schema).toEqual({ type: 'string', description: 'Optional field', optional: true });
    });

    it('preserves original schema properties', () => {
      const schema = optional(enumOf(['a', 'b'], 'Choice'));
      expect(schema.enum).toEqual(['a', 'b']);
      expect(schema.optional).toBe(true);
    });
  });
});

describe('ClientToolBuilder (tool)', () => {
  it('creates minimal tool', () => {
    const t = tool('my_tool').build();
    expect(t).toEqual({
      name: 'my_tool',
      display_name: 'my_tool',
      description: '',
      type: ToolTypeClient,
      require_approval: undefined,
      client: {
        input_schema: { type: 'object', properties: {}, required: [] },
      },
    });
  });

  it('creates tool with description', () => {
    const t = tool('greet').describe('Says hello').build();
    expect(t.description).toBe('Says hello');
  });

  it('creates tool with display name', () => {
    const t = tool('get_data').display('Get Data').build();
    expect(t.display_name).toBe('Get Data');
  });

  it('creates tool with parameters', () => {
    const t = tool('add')
      .param('a', number('First number'))
      .param('b', number('Second number'))
      .build();

    expect(t.client?.input_schema).toEqual({
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
    });
  });

  it('handles optional parameters correctly', () => {
    const t = tool('search')
      .param('query', string('Search query'))
      .param('limit', optional(integer('Max results')))
      .build();

    expect(t.client?.input_schema.required).toEqual(['query']);
    expect(t.client?.input_schema.properties).toHaveProperty('limit');
  });

  it('creates tool with require approval', () => {
    const t = tool('dangerous').requireApproval().build();
    expect(t.require_approval).toBe(true);
  });

  it('creates tool with nested object parameters', () => {
    const t = tool('create_user')
      .param('user', object({
        name: string('Name'),
        email: string('Email'),
      }, 'User data'))
      .build();

    const schema = t.client?.input_schema;
    expect(schema?.properties?.user).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name' },
        email: { type: 'string', description: 'Email' },
      },
    });
  });

  it('creates tool with array parameters', () => {
    const t = tool('process_items')
      .param('items', array(string('Item'), 'List of items'))
      .build();

    expect(t.client?.input_schema.properties?.items).toMatchObject({
      type: 'array',
      items: { type: 'string', description: 'Item' },
    });
  });
});

describe('AppToolBuilder (appTool)', () => {
  it('creates app tool with reference', () => {
    const t = appTool('generate', 'infsh/flux@v1.0')
      .describe('Generate image')
      .build();

    expect(t.type).toBe(ToolTypeApp);
    expect(t.app).toEqual({ ref: 'infsh/flux@v1.0' });
    expect(t.description).toBe('Generate image');
  });

  it('handles app reference with latest version', () => {
    const t = appTool('browse', 'my-org/browser@latest').build();
    expect(t.app).toEqual({ ref: 'my-org/browser@latest' });
  });

  it('includes parameters', () => {
    const t = appTool('fetch', 'infsh/fetch@v1')
      .param('url', string('URL to fetch'))
      .build();

    expect(t.name).toBe('fetch');
    // Note: App tools don't use client input_schema, params are for documentation
  });
});

describe('AgentToolBuilder (agentTool)', () => {
  it('creates agent tool with reference', () => {
    const t = agentTool('research', 'acme/researcher@v2')
      .describe('Research a topic')
      .build();

    expect(t.type).toBe(ToolTypeAgent);
    expect(t.agent).toEqual({ ref: 'acme/researcher@v2' });
  });

  it('supports display name and approval', () => {
    const t = agentTool('coder', 'infsh/code-agent@latest')
      .display('Code Assistant')
      .requireApproval()
      .build();

    expect(t.display_name).toBe('Code Assistant');
    expect(t.require_approval).toBe(true);
  });
});

describe('WebhookToolBuilder (webhookTool)', () => {
  it('creates webhook tool with URL', () => {
    const t = webhookTool('notify', 'https://api.example.com/webhook')
      .describe('Send notification')
      .build();

    expect(t.type).toBe(ToolTypeHook);
    expect(t.hook?.url).toBe('https://api.example.com/webhook');
    expect(t.description).toBe('Send notification');
  });

  it('includes secret key', () => {
    const t = webhookTool('slack', 'https://hooks.slack.com/services/xxx')
      .secret('SLACK_SECRET')
      .build();

    expect(t.hook?.secret).toBe('SLACK_SECRET');
  });

  it('generates input schema for parameters', () => {
    const t = webhookTool('send', 'https://api.example.com')
      .param('message', string('Message'))
      .param('priority', optional(enumOf(['low', 'high'])))
      .build();

    expect(t.hook?.input_schema).toEqual({
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message' },
        priority: { type: 'string', enum: ['low', 'high'] },
      },
      required: ['message'],
    });
  });
});

describe('InternalToolsBuilder (internalTools)', () => {
  it('creates empty config by default', () => {
    const config = internalTools().build();
    expect(config).toEqual({});
  });

  it('enables plan tools', () => {
    const config = internalTools().plan().build();
    expect(config).toEqual({ plan: true });
  });

  it('enables memory tools', () => {
    const config = internalTools().memory().build();
    expect(config).toEqual({ memory: true });
  });

  it('enables widget tools', () => {
    const config = internalTools().widget().build();
    expect(config).toEqual({ widget: true });
  });

  it('enables finish tool', () => {
    const config = internalTools().finish().build();
    expect(config).toEqual({ finish: true });
  });

  it('chains multiple tool enables', () => {
    const config = internalTools().plan().memory().widget().build();
    expect(config).toEqual({ plan: true, memory: true, widget: true });
  });

  it('enables all tools with all()', () => {
    const config = internalTools().all().build();
    expect(config).toEqual({ plan: true, memory: true, widget: true, finish: true });
  });

  it('disables all tools with none()', () => {
    const config = internalTools().none().build();
    expect(config).toEqual({ plan: false, memory: false, widget: false, finish: false });
  });

  it('allows explicit disable', () => {
    const config = internalTools().plan(false).memory(true).build();
    expect(config).toEqual({ plan: false, memory: true });
  });
});

describe('Fluent API chaining', () => {
  it('supports full fluent chain', () => {
    const t = tool('complex')
      .display('Complex Tool')
      .describe('A complex tool with many params')
      .param('name', string('Name'))
      .param('count', integer('Count'))
      .param('options', optional(object({
        verbose: boolean('Verbose mode'),
        tags: array(string('Tag')),
      })))
      .requireApproval()
      .build();

    expect(t.name).toBe('complex');
    expect(t.display_name).toBe('Complex Tool');
    expect(t.description).toBe('A complex tool with many params');
    expect(t.require_approval).toBe(true);
    expect(t.client?.input_schema.required).toEqual(['name', 'count']);
  });
});

