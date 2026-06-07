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
| `tool-builder.ts` | `npx tsx examples/tool-builder.ts` | Tool builders (`tool`, `httpTool`, `mcpTool`, …) and `ToolParamType*` schemas (no API key) |

## SDK constants

The README documents typed constants for tasks, integrations, instances, and tool parameters:

- **Task status:** `TaskStatusCompleted`, `TaskStatusRunning`, …
- **Integrations:** `IntegrationProvider*`, `IntegrationAuthType*`, `IntegrationStatus*` — use with `IntegrationDTO` and `isRequirementsNotMetException()` when a run returns HTTP 412
- **Instances:** `InstanceStatus*` — for engine instance APIs (`InstanceDTO.status`)
- **Tool schemas:** `ToolParamType*` — JSON Schema `type` values when building `AgentTool` manually (the tool builder infers these automatically)

See the [Integrations guide](https://inference.sh/docs/extend/integrations) for declaring OAuth integrations in `inf.yml`.
