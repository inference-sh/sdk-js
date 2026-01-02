/**
 * Tool Builder Example (CommonJS)
 * 
 * Demonstrates the fluent API for building tools.
 * 
 * Usage:
 *   node examples/tool-builder.cjs
 */

const {
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
} = require('@inferencesh/sdk');

// =============================================================================
// Client Tools (executed locally)
// =============================================================================

// Simple tool with basic parameters
const scanUiTool = tool('scan_ui')
  .display('Scan UI')
  .describe('Scans the UI and returns an accessibility tree')
  .build();

console.log('scan_ui tool:', JSON.stringify(scanUiTool, null, 2));
console.log();

// Tool with parameters
const fillFieldTool = tool('fill_field')
  .describe('Fills a form field by its name or label')
  .param('field', string('The field name, label, or ID'))
  .param('value', string('The value to fill'))
  .build();

console.log('fill_field tool:', JSON.stringify(fillFieldTool, null, 2));
console.log();

// Tool with complex parameters
const interactTool = tool('interact')
  .describe('Performs a UI interaction')
  .param('selector', string('CSS selector or accessibility ID'))
  .param('action', enumOf(['click', 'double_click', 'right_click', 'hover', 'focus'], 'Action type'))
  .param('modifiers', optional(array(enumOf(['shift', 'ctrl', 'alt', 'meta'], 'Modifier key'), 'Modifier keys to hold')))
  .build();

console.log('interact tool:', JSON.stringify(interactTool, null, 2));
console.log();

// Tool requiring approval (Human-in-the-Loop)
const executeCommandTool = tool('execute_command')
  .describe('Executes a shell command')
  .param('command', string('The command to execute'))
  .param('cwd', optional(string('Working directory')))
  .param('timeout', optional(integer('Timeout in milliseconds')))
  .requireApproval()
  .build();

console.log('execute_command tool:', JSON.stringify(executeCommandTool, null, 2));
console.log();

// =============================================================================
// App Tools (server-side execution via existing app)
// =============================================================================

const browserTool = appTool('browser', 'infsh/browser@latest')
  .describe('Browses a URL and returns page content')
  .param('url', string('URL to browse'))
  .param('wait_for', optional(string('CSS selector to wait for')))
  .param('screenshot', optional(boolean('Take a screenshot')))
  .build();

console.log('browser app tool:', JSON.stringify(browserTool, null, 2));
console.log();

// =============================================================================
// Agent Tools (server-side agent execution)
// =============================================================================

const researchTool = agentTool('research', 'my-org/research-agent@latest')
  .describe('Researches a topic using a specialized agent')
  .param('topic', string('Topic to research'))
  .param('depth', optional(enumOf(['shallow', 'medium', 'deep'], 'Research depth')))
  .build();

console.log('research agent tool:', JSON.stringify(researchTool, null, 2));
console.log();

// =============================================================================
// Webhook Tools (external API calls)
// =============================================================================

const slackTool = webhookTool('send_slack', 'https://hooks.slack.com/services/XXX')
  .describe('Sends a message to Slack')
  .secret('SLACK_SECRET')
  .param('channel', string('Slack channel'))
  .param('message', string('Message content'))
  .param('thread_ts', optional(string('Thread timestamp for replies')))
  .build();

console.log('slack webhook tool:', JSON.stringify(slackTool, null, 2));
console.log();

// =============================================================================
// Nested Object Parameters
// =============================================================================

const createUserTool = tool('create_user')
  .describe('Creates a new user with profile')
  .param('username', string('Unique username'))
  .param('email', string('Email address'))
  .param('profile', object({
    firstName: string('First name'),
    lastName: string('Last name'),
    age: optional(integer('Age in years')),
    tags: optional(array(string('Tag'), 'User tags')),
  }, 'User profile'))
  .build();

console.log('create_user tool:', JSON.stringify(createUserTool, null, 2));
console.log();

// =============================================================================
// Internal Tools (built-in agent capabilities)
// =============================================================================

// Enable specific internal tools
const agentInternals = internalTools()
  .memory()     // Enable memory/context
  .plan()       // Enable planning
  .widget()     // Enable widget rendering
  .build();

console.log('internal tools:', JSON.stringify(agentInternals, null, 2));
console.log();

// Enable all internal tools
const allInternals = internalTools().all().build();
console.log('all internal tools:', JSON.stringify(allInternals, null, 2));
console.log();

// =============================================================================
// Complete Agent Configuration Example
// =============================================================================

const agentConfig = {
  coreApp: 'infsh/claude-sonnet-4@latest',
  name: 'Browser Assistant',
  systemPrompt: 'You help users browse and interact with web pages.',
  tools: [
    scanUiTool,
    fillFieldTool,
    interactTool,
    executeCommandTool,
    browserTool,
  ],
  internalTools: internalTools().memory().widget().build(),
};

console.log('Complete agent config:', JSON.stringify(agentConfig, null, 2));

