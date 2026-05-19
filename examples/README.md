# Examples

These examples demonstrate how to use the `@inferencesh/sdk` package.

## Setup

1. Install dependencies and build the SDK for local runs:

   ```bash
   npm install
   npm run build
   ```

2. Set your API key (and optional base URL for dev):

   ```bash
   export INFERENCE_API_KEY="your-api-key"
   export INFERENCE_BASE_URL="https://api.inference.sh"  # optional
   ```

## Running examples

| Example | Command | Description |
|---------|---------|-------------|
| `basic.js` | `node examples/basic.js` | Run a task and print the result |
| `agent-template.ts` | `npx tsx examples/agent-template.ts` | Chat with a workspace agent template (`AGENT=namespace/name@shortid`) |
| `agent-chat.ts` | `npx tsx examples/agent-chat.ts` | Ad-hoc agent with client tools and multi-turn chat |
| `tool-builder.ts` | `npx tsx examples/tool-builder.ts` | Tool schema builder (no API key required) |

### Template agent

```bash
export INFERENCE_API_KEY="your-api-key"
export AGENT="my-org/assistant@abc123"
npx tsx examples/agent-template.ts
```

### Ad-hoc agent with tools

```bash
export INFERENCE_API_KEY="your-api-key"
npx tsx examples/agent-chat.ts
```

## Related documentation

- [SDK README](../README.md) — tasks, sessions, streaming/polling, and agent chat
- [Sessions guide](https://inference.sh/docs/extend/sessions) — stateful execution and `client.sessions` API
