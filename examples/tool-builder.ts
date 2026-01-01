/**
 * Tool Builder Example
 * 
 * Demonstrates the fluent API for building agent tools.
 * No API key required - just shows the tool schemas.
 * 
 * Usage:
 *   npx ts-node examples/tool-builder.ts
 */

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
} from '../src';

// =============================================================================
// Client Tools (executed in SDK consumer's environment)
// =============================================================================

// Simple tool with typed parameters
const scanUI = tool('scan_ui')
  .describe('Scans the UI and returns an accessibility tree')
  .display('Scan UI')
  .build();

console.log('scan_ui tool:', JSON.stringify(scanUI, null, 2));

// Tool with multiple parameters
const fillField = tool('fill_field')
  .describe('Fills a form field by its name or label')
  .param('field', string('The field name, label, or ID'))
  .param('value', string('The value to fill'))
  .build();

console.log('\nfill_field tool:', JSON.stringify(fillField, null, 2));

// Tool with enum parameter
const interact = tool('interact')
  .describe('Performs a UI interaction')
  .param('selector', string('CSS selector for the element'))
  .param('action', enumOf(['click', 'type', 'select', 'focus', 'blur'], 'Action to perform'))
  .param('text', optional(string('Text to type (for type action)')))
  .build();

console.log('\ninteract tool:', JSON.stringify(interact, null, 2));

// Tool with complex nested parameters
const createTask = tool('create_task')
  .describe('Creates a new task with metadata')
  .param('title', string('Task title'))
  .param('priority', enumOf(['low', 'medium', 'high'], 'Priority level'))
  .param('tags', array(string('Tag name'), 'List of tags'))
  .param('metadata', optional(object({
    assignee: optional(string('Assignee email')),
    dueDate: optional(string('Due date (ISO format)')),
    estimate: optional(integer('Time estimate in hours')),
  }, 'Additional metadata')))
  .requireApproval() // Human-in-the-loop
  .build();

console.log('\ncreate_task tool (with HIL):', JSON.stringify(createTask, null, 2));

// =============================================================================
// Server Tools (executed on inference.sh servers)
// =============================================================================

// App tool - calls another inference app
const generateImage = appTool('generate_image', 'infsh/flux-schnell@abc123')
  .describe('Generates an image from a text prompt')
  .param('prompt', string('Image description'))
  .param('width', optional(integer('Image width')))
  .param('height', optional(integer('Image height')))
  .requireApproval() // Costs credits
  .build();

console.log('\ngenerate_image (app tool):', JSON.stringify(generateImage, null, 2));

// Agent tool - delegates to sub-agent
const codeReview = agentTool('code_review', 'infsh/code-reviewer@xyz789')
  .describe('Reviews code for best practices and bugs')
  .param('code', string('Code to review'))
  .param('language', enumOf(['typescript', 'python', 'go', 'rust'], 'Programming language'))
  .build();

console.log('\ncode_review (agent tool):', JSON.stringify(codeReview, null, 2));

// Webhook tool - calls external URL
const sendSlack = webhookTool('send_slack', 'https://hooks.slack.com/services/...')
  .describe('Sends a message to Slack')
  .secret('SLACK_WEBHOOK_SECRET')
  .param('channel', string('Channel name'))
  .param('message', string('Message text'))
  .param('urgent', optional(boolean('Mark as urgent')))
  .build();

console.log('\nsend_slack (webhook tool):', JSON.stringify(sendSlack, null, 2));

// =============================================================================
// Internal Tools Configuration
// =============================================================================

// Using fluent builder
const internalConfig = internalTools()
  .plan()     // Enable plan tools
  .memory()   // Enable memory tools
  .build();

console.log('\nInternal tools config:', JSON.stringify(internalConfig, null, 2));

// Or enable all
const allInternal = internalTools().all().build();
console.log('All internal tools:', JSON.stringify(allInternal, null, 2));

// Or disable all
const noInternal = internalTools().none().build();
console.log('No internal tools:', JSON.stringify(noInternal, null, 2));

// =============================================================================
// Full Agent Config Example
// =============================================================================

const agentConfig = {
  coreApp: 'infsh/claude-sonnet-4@latest',
  name: 'Form Assistant',
  systemPrompt: 'You are a helpful assistant that can interact with forms.',
  tools: [scanUI, fillField, interact, generateImage],
  internalTools: internalTools().memory().build(),
};

console.log('\n=== Full Agent Config ===');
console.log(JSON.stringify(agentConfig, null, 2));

