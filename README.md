# @inferencesh/sdk — ai inference api for javascript & typescript

[![npm version](https://img.shields.io/npm/v/@inferencesh/sdk.svg)](https://www.npmjs.com/package/@inferencesh/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@inferencesh/sdk.svg)](https://www.npmjs.com/package/@inferencesh/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

official javascript/typescript sdk for [inference.sh](https://inference.sh) — the ai agent runtime for serverless ai inference.

run ai models, build ai agents, and deploy generative ai applications with a simple api. access 150+ models including flux, stable diffusion, llms (claude, gpt, gemini), video generation (veo, seedance), and more.

## Installation

```bash
npm install @inferencesh/sdk
# or
yarn add @inferencesh/sdk
# or
pnpm add @inferencesh/sdk
```

## Getting an API Key

Get your API key from the [inference.sh dashboard](https://app.inference.sh/settings/keys).

## Quick Start

```typescript
import { inference, TaskStatusCompleted } from '@inferencesh/sdk';

const client = inference({ apiKey: 'your-api-key' });

// Run a task and wait for the result
const result = await client.tasks.run({
  app: 'your-app',
  input: {
    prompt: 'Hello, world!'
  }
});

if (result.status === TaskStatusCompleted) {
  console.log(result.output);
}
```

## Usage

### Basic Usage

```typescript
import { inference, TaskStatusCompleted } from '@inferencesh/sdk';

const client = inference({ apiKey: 'your-api-key' });

// Wait for result (default behavior)
const result = await client.tasks.run({
  app: 'my-app',
  input: { prompt: 'Generate something amazing' }
});

if (result.status === TaskStatusCompleted) {
  console.log('Output:', result.output);
}
```

### With Setup Parameters

Setup parameters configure the app instance (e.g., model selection). Workers with matching setup are "warm" and skip setup:

```typescript
const result = await client.tasks.run({
  app: 'my-app',
  setup: { model: 'schnell' },  // Setup parameters
  input: { prompt: 'hello' }
});
```

### Fire and Forget

```typescript
// Get task info immediately without waiting
const task = await client.tasks.run(
  { app: 'my-app', input: { prompt: 'hello' } },
  { wait: false }
);

console.log('Task ID:', task.id);
console.log('Status:', task.status);
```

### Real-time Status Updates

```typescript
const result = await client.tasks.run(
  { app: 'my-app', input: { prompt: 'hello' } },
  {
    onUpdate: (update) => {
      console.log('Status:', update.status);
      console.log('Progress:', update.logs);
    }
  }
);
```

### Batch Processing

```typescript
async function processImages(images: string[]) {
  const results = [];

  for (const image of images) {
    const result = await client.tasks.run({
      app: 'image-processor',
      input: { image }
    }, {
      onUpdate: (update) => console.log(`Processing: ${update.status}`)
    });

    results.push(result);
  }

  return results;
}
```

### File Upload

```typescript
// Upload from base64
const file = await client.files.upload('data:image/png;base64,...', {
  filename: 'image.png',
  contentType: 'image/png'
});

// Use the uploaded file in a task
const result = await client.tasks.run({
  app: 'image-app',
  input: { image: file.uri }
});
```

### Cancel a Task

```typescript
const task = await client.tasks.run(
  { app: 'long-running-app', input: {} },
  { wait: false }
);

// Cancel if needed
await client.tasks.cancel(task.id);
```

### Sessions (Stateful Execution)

Sessions allow you to maintain state across multiple task invocations. The worker stays warm between calls, preserving loaded models and in-memory state.

```typescript
// Start a new session
const result = await client.tasks.run({
  app: 'my-stateful-app',
  input: { prompt: 'hello' },
  session: 'new'
});

const sessionId = result.session_id;
console.log('Session ID:', sessionId);

// Continue the session with another call
const result2 = await client.tasks.run({
  app: 'my-stateful-app',
  input: { prompt: 'remember what I said?' },
  session: sessionId
});
```

#### Custom Session Timeout

By default, sessions expire after 60 seconds of inactivity. You can customize this with `session_timeout` (1-3600 seconds):

```typescript
// Create a session with 5-minute idle timeout
const result = await client.tasks.run({
  app: 'my-stateful-app',
  input: { prompt: 'hello' },
  session: 'new',
  session_timeout: 300  // 5 minutes
});

// Session stays alive for 5 minutes after each call
```

**Notes:**
- `session_timeout` is only valid when `session: 'new'`
- Minimum timeout: 1 second
- Maximum timeout: 3600 seconds (1 hour)
- Each successful call resets the idle timer

For complete session documentation including error handling, best practices, and advanced patterns, see the [Sessions Developer Guide](https://inference.sh/docs/extend/sessions).

## Agent Chat

Chat with AI agents using `client.agents.create()`.

### Using a Template Agent

Use an existing agent from your workspace by its `namespace/name@shortid`:

```typescript
import { inference } from '@inferencesh/sdk';

const client = inference({ apiKey: 'your-api-key' });

// Create agent from template
const agent = client.agents.create('my-org/assistant@abc123');

// Send a message with streaming
await agent.sendMessage('Hello!', {
  onMessage: (msg) => {
    if (msg.content) {
      for (const c of msg.content) {
        if (c.type === 'text' && c.text) {
          process.stdout.write(c.text);
        }
      }
    }
  }
});

// Clean up
agent.disconnect();
```

### Creating an Ad-Hoc Agent

Create agents on-the-fly without saving to your workspace:

```typescript
import { inference, tool, string } from '@inferencesh/sdk';

const client = inference({ apiKey: 'your-api-key' });

// Create ad-hoc agent
const agent = client.agents.create({
  coreApp: 'infsh/claude-sonnet-4@abc123',  // LLM to use
  systemPrompt: 'You are a helpful assistant.',
  tools: [
    tool('get_weather')
      .description('Get current weather')
      .params({ city: string('City name') })
      .handler(async (args) => {
        // Your tool logic here
        return JSON.stringify({ temp: 72, conditions: 'sunny' });
      })
      .build()
  ]
});

await agent.sendMessage('What is the weather in Paris?', {
  onMessage: (msg) => console.log(msg),
  onToolCall: async (call) => {
    // Tool handlers are auto-executed if defined
  }
});
```

### Agent Methods

| Method | Description |
|--------|-------------|
| `sendMessage(text, options?)` | Send a message to the agent |
| `getChat(chatId?)` | Get chat history |
| `stopChat(chatId?)` | Stop current generation |
| `submitToolResult(toolId, resultOrAction)` | Submit result for a client tool (string or {action, form_data}) |
| `streamMessages(chatId?, options?)` | Stream message updates |
| `streamChat(chatId?, options?)` | Stream chat updates |
| `disconnect()` | Clean up streams |
| `reset()` | Start a new conversation |

## API Reference

### `inference(config)`

Creates a new inference client.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.apiKey` | `string` | Yes | Your inference.sh API key |
| `config.baseUrl` | `string` | No | Custom API URL (default: `https://api.inference.sh`) |

### `client.tasks.run(params, options?)`

Runs a task on inference.sh.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `params.app` | `string` | Yes | App identifier (e.g., `'username/app-name'`) |
| `params.input` | `object` | Yes | Input parameters for the app |
| `params.setup` | `object` | No | Setup parameters (affects worker warmth/scheduling) |
| `params.infra` | `string` | No | Infrastructure: `'cloud'` or `'private'` |
| `params.variant` | `string` | No | App variant to use |
| `params.session` | `string` | No | Session ID or `'new'` to start a new session |
| `params.session_timeout` | `number` | No | Session timeout in seconds (1-3600, only with `session: 'new'`) |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `wait` | `boolean` | `true` | Wait for task completion |
| `onUpdate` | `function` | - | Callback for status updates |
| `autoReconnect` | `boolean` | `true` | Auto-reconnect on connection loss |
| `maxReconnects` | `number` | `5` | Max reconnection attempts |
| `reconnectDelayMs` | `number` | `1000` | Delay between reconnects (ms) |

### `client.tasks.get(taskId)`

Gets a task by ID.

### `client.tasks.cancel(taskId)`

Cancels a running task.

### `client.files.upload(data, options?)`

Uploads a file to inference.sh.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `data` | `string \| Blob` | Base64 string, data URI, or Blob |
| `options.filename` | `string` | Filename |
| `options.contentType` | `string` | MIME type |
| `options.public` | `boolean` | Make file publicly accessible |

### `client.agents.create(templateOrConfig)`

Creates an agent instance from a template or ad-hoc configuration.

**Template mode:**
```typescript
const agent = client.agents.create('namespace/name@version');
```

**Ad-hoc mode:**
```typescript
const agent = client.agents.create({
  coreApp: 'infsh/claude-sonnet-4@abc123',
  systemPrompt: 'You are helpful.',
  tools: [...]
});
```

## Task Status Constants

```typescript
import {
  TaskStatusQueued,
  TaskStatusRunning,
  TaskStatusCompleted,
  TaskStatusFailed,
  TaskStatusCancelled
} from '@inferencesh/sdk';

if (task.status === TaskStatusCompleted) {
  console.log('Done!');
}
```

## TypeScript Support

This SDK is written in TypeScript and includes full type definitions. All types are exported:

```typescript
import type { Task, ApiTaskRequest, RunOptions } from '@inferencesh/sdk';
```

## Requirements

- Node.js 18.0.0 or higher
- Modern browsers with `fetch` support

## resources

- [documentation](https://inference.sh/docs) — getting started guides and api reference
- [blog](https://inference.sh/blog) — tutorials on ai agents, image generation, and more
- [app store](https://app.inference.sh) — browse 150+ ai models
- [discord](https://discord.gg/RM77SWSbyT) — community support
- [github](https://github.com/inference-sh) — open source projects

## license

MIT © [inference.sh](https://inference.sh)
