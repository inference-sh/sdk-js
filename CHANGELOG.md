# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `useAgentActions().getAlwaysAllowOptions(toolInvocationId)`: what "always allow" can save for a call awaiting approval, narrowest first, computed by the api (`GET /chats/{id}/tools/{toolId}/always-allow/options`). Each option has a `key`, a `scope` (`exact`, `prefix`, `folder`, `remote`, `tool`), a `label` such as "npm run commands on laptop", and the chat `rules` it saves; `default` is the narrowest that answers the call again, and `unavailable` says why there are none.
- `useAgentActions().explainTool(toolInvocationId)`: a plain-words explanation of a call awaiting approval, `{ risk_level: 'low' | 'medium' | 'high', explanation, reasoning, risk }` (`POST /chats/{id}/tools/{toolId}/explain`). A model writes it the first time it is asked for and the api keeps it for the call; call it only when the person asks.
- Types: `ToolExplanationDTO`, `ToolRiskLevel`, `AlwaysAllowOptionsDTO`, `AlwaysAllowOptionDTO`, `AlwaysAllowScope`, `AlwaysAllowRequest`, `AlwaysAllowResultDTO`, `PolicyRuleDTO` (with `label`), `AlwaysAllowChoice`.

### Changed

- `useAgentActions().alwaysAllowTool(toolInvocationId, { option })` saves the chosen option and resolves to the saved rules. The second argument used to be the tool name; a string is still accepted and means the api's default. A 409 (stale option) or 400 rejects without putting the chat in the error state.

## [0.15.0] - 2026-10-02

### Added

- `useAgentActions().updateChatSettings(settings)`: change a chat's name, visibility, `allow_all_tools` (run every tool without asking; switching it on approves the calls already waiting), `disable_hooks` and `forget_memory` (`POST /chats/{id}/settings`).
- `useAgentActions().switchAgent(agentRef)`: hand the chat to another agent our loop runs; the next message goes to it. A harness agent is refused.
- Types: `ChatSettingsRequest`; `ChatData.allow_all_tools` and `disable_hooks`; per-server MCP headers; API key scope and an optional `last_used_at`; engine-picker provider options.

### Changed

- The `inference-src` export condition is listed before `types`, so a bundler that sets it resolves the TypeScript source.

## [0.14.2] - 2026-10-01

### Added

- Instance types: `InstanceRentalType` (`on_demand`, `spot`), `rental_type` on availability and engine-picker offers, `hourly_price` on spot entries.
- `lifecycleHook(event).builtin(name)` for hooks the platform runs itself.
- `learningHooks({ suggest, learn })`: `suggest` adds the team's matching skills, knowledge and apps to context before each turn (`belt:suggest`); `learn` saves reusable knowledge from the conversation to the team's registry every 10th user turn and before compaction (`belt:extract`). Both are off unless set.
- `BuiltinHookBeltExtract`.

## [0.14.1] - 2026-10-01

### Added

- `internalTools()` builder methods for every category: `knowledge()` (search, read, save and delete skills and knowledge entries), `agent()` (run a copy of the agent on a side task), `skills()`, `artifact()` and `remote()`.
- `InternalToolsConfig.knowledge` and `InternalToolsConfig.agent`.

### Changed

- `InternalToolsConfig.spawn` is now `agent`. The API still reads a stored or sent `spawn` as `agent`.

### Deprecated

- `InternalToolsConfig.host_context`: the API ignores it and no longer offers `get_host_context` or `send_to_host`.

## [0.14.0] - 2026-09-27

### Fixed

- `tasks.create()` returns `TaskResultDTO`, what `POST /apps/run` sends (id, status, output, socket), instead of claiming a full `Task`. `run(..., { wait: false })` fetches the full task with `GET /tasks/{id}` before returning it.
- `teams.list()`, `get()`, `create()` and `update()` return `TeamDTO`, what the server sends, instead of `TeamRelationDTO`.
- `MeResponse` is the generated type (adds `org`, `team_view` and `diagnostics`; `team` is a `TeamDTO`) instead of a hand-written one.

## [0.8.0] - 2026-09-24

### Removed

- The integration-named aliases: `IntegrationsAPI`, `client.integrations`, the `Integration*` type aliases, and `httpTool().auth({ integration, integrationId })`. Use `CredentialsAPI`, `client.credentials`, the `Credential*` types and `auth({ credential, credentialId })`.

## [0.7.0] - 2026-09-23

### Changed

- `client.credentials` (`CredentialsAPI`) replaces `client.integrations` / `IntegrationsAPI`; both old names remain as deprecated aliases
- `httpTool().auth({ credential, credentialId })` writes auth type `credential`; `integration` / `integrationId` still work
- Requirement errors use type `credential` (was `integration`); check against `RequirementTypeCredential`
- `CredentialsAPI.checkRequirements` is typed (`CheckRequirementsRequest` with `credentials`, `CheckRequirementsResponse`)
- API key scopes are `credentials:read` / `credentials:write` (`integrations:*` keys keep working)

## [0.6.8] - 2026-05-20

### Added

- README tool builder section: `httpTool`/`callTool` auth, `mcpTool`, and builder comparison table
- `examples/tool-builder.ts` demonstrates HTTP and MCP tool schemas

- Typed SDK constants for integrations: `IntegrationProvider*`, `IntegrationAuthType*`, `IntegrationStatus*`
- `IntegrationDTO` fields (`provider`, `type`, `auth`, `status`) now use those typed aliases
- Additional `InstanceStatus*` constants (`creating`, `pending_provider`, `error`, `deleting`)
- `ToolParamType*` constants for JSON Schema tool parameter types (distinct from `ToolCallType`)

## [0.6.7] - 2026-05-19

### Added

- `client.sessions` API: `get`, `list`, `keepalive`, and `end` for session lifecycle management
- Session error types: `SessionNotFoundError`, `SessionExpiredError`, `SessionEndedError`
- Agent chat: `sendMessage` file attachments (upload `Blob` or reuse uploaded file `uri`)
- Agent lifecycle: `stopChat()`, `reset()`, and `agent.run()` for structured output via polling
- Task streaming: `onPartialUpdate` callback for partial NDJSON stream payloads
- Client config: `stream` and `pollIntervalMs` for global streaming vs status polling

### Changed

- README documents ad-hoc agent field names (`core_app`, `system_prompt`) and tool builder API
- Polling mode: `run()` rejects if full task fetch fails after a status transition

## [0.1.1] - 2024-11-30

### Added

- Partial data handling for streaming updates (matches Python SDK behavior)
- `onPartialUpdate` callback option to receive list of changed fields
- Export `StreamManager` and `PartialDataWrapper` types

### Fixed

- Stream updates now properly extract data from server's partial update wrapper
- Removed unused `onYield` callback

## [0.1.0] - 2024-11-30

### Added

- Initial release
- `Inference` client class for API communication
- `run()` method for executing tasks with optional waiting
- `cancel()` method for cancelling running tasks
- `uploadFile()` method for file uploads (base64, data URI, Blob)
- Real-time status updates via `onUpdate` callback
- Automatic reconnection for streaming connections
- Full TypeScript support with exported types
- Task status constants (`TaskStatusCompleted`, `TaskStatusFailed`, etc.)

### Features

- Simple, promise-based API
- Streaming status updates via Server-Sent Events
- Automatic file upload handling in task inputs
- Configurable reconnection behavior
- Comprehensive error handling

[Unreleased]: https://github.com/inference-sh/sdk-js/compare/v0.6.8...HEAD
[0.6.8]: https://github.com/inference-sh/sdk-js/compare/v0.6.7...v0.6.8
[0.6.7]: https://github.com/inference-sh/sdk-js/compare/v0.6.6...v0.6.7
[0.1.1]: https://github.com/inference-sh/sdk-js/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/inference-sh/sdk-js/releases/tag/v0.1.0

