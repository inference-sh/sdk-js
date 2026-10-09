# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Breaking for server proxy users: the proxy forwards only app runs and agent chats and refuses every other API call with 403. Release as a minor (0.22.0). See Security.

### Added

- Server proxy options (`@inferencesh/sdk/proxy` and every adapter): `allowedEndpoints` (`namespace/name` globs, e.g. `"ana/helper"`, `"ana/*"`) limits which apps and agents visitors may run; `isAuthenticated(request)` decides per request whether the API key may be used (401 otherwise) and receives the framework's request; `allowUnauthorizedRequests` (default `true`) set to `false` refuses every request unless `isAuthenticated` is given. `@inferencesh/sdk/proxy/nextjs` gains `createHandler(options)` (App Router) and `createPageHandler(options)` (Page Router); `handlers` and `pageHandler` are those with the default options. `PROXY_ENDPOINTS` lists what the proxy forwards. `apiUrl` (default `https://api.inference.sh`) names the API the frontend's client calls; `maxUploadBytes` (default 100 MiB) caps a file uploaded through the proxy.
- `AppsAPI.patch(appId, AppPatchBody)`: PATCH /apps/{id}, changes the app's copy fields sent and keeps the others. `update()` stays POST, since it also edits the version in place.

### Changed

- `update()` on `ProjectsAPI`, `KnowledgeAPI`, `SkillsAPI`, `ChatsAPI`, `EnginesAPI` and `TeamsAPI` sends PATCH instead of POST: a field left out of the body keeps its value. With POST the API wrote every field left out as empty. Needs an API that answers PATCH on these routes; an older API answers 405.

### Deprecated

- `FlowRunsAPI.update()`: the API refuses it, because a flow run has no caller-writable fields. Use `FlowRunsAPI.updateVisibility()` to change who can see a run. The method stays for compile compatibility.

### Security

- The server proxy forwards only what a frontend needs to run things, listed in `PROXY_ENDPOINTS`: `POST /apps/run`, `POST /files` (uploads of run inputs), `POST /agents/run`, `POST /chats`, `POST /chats/{id}/messages`, `POST /chats/{id}/agent`, `GET /agents/{namespace}/{name}`, reading, polling, streaming, stopping and cancelling the resulting task or chat, and client tool results (`POST /tools/{id}`). Every other call (secrets, API keys, billing, account, file listings, app/agent/flow management, admin, task and chat listings and feeds) answers 403 before the API key is attached, whatever the options. Before, it forwarded any path on `*.inference.sh` with the site's key. A server that proxied other calls for its frontend must make them from its own backend.
- Ids in proxied paths must have the shape the API mints (a lowercase 26-character ULID), so a literal route beside an id is never taken for one: `GET /tasks/stream` (the live feed of every task the key can read), `/tasks/featured`, `/tasks/queue-stats`, `/chats/list` and the like answer 403.
- Tool approvals are not forwarded: approve, reject, always allow, explain, resolving an interrupt, listing a run's interrupts, and chat settings (`allow_all_tools`). The API takes an approval only from the account holder's own sign-in, never an API key, so these could not work through a proxy, and "allow all tools" would have let any visitor holding a chat id approve every call in it. Agents served through a proxy should not use approval-gated tools; use a published agent (embed) for that.
- The proxy forwards only to the configured API origin: `apiBaseUrl` / `INFERENCE_API_BASE_URL` when set, else `apiUrl` (default `https://api.inference.sh`). Other `*.inference.sh` hosts are refused with 412. `allowedDomains` patterns must match the whole host.
- `POST /apps/run` through the proxy takes only `app`, `app_id`, `version_id`, `function`, `input`, `stream` and `wait`: a visitor can no longer set `workers`, `infra`, `session`, `session_timeout`, `webhook`, `run_at`, `setup` or `metadata` (403).
- `POST /files` through the proxy takes one file per request, with no `category`, and a declared `size` up to `maxUploadBytes` (413 above it). Uploads count against the API key owner's storage quota.
- With `allowedEndpoints` set, a request that names an app or agent must name an allowed one by its `namespace/name` ref: `app_id`/`version_id` runs and ad-hoc `agent_config` runs are refused, and body keys are matched case-insensitively as the API reads them. Requests about an existing task or chat name it by id and are not checked against `allowedEndpoints`: whoever holds a task or chat id can read, stream, cancel or stop it and send messages in the chat. All visitors share the key, so the id is the only boundary between them.
- The server proxy (`@inferencesh/sdk/proxy`) refuses a target that is not `https:` with 412 before attaching the API key, so a client can no longer make it send `INFERENCE_API_KEY` over plain http. Plain `http:` is allowed only to a loopback host (`localhost`, `*.localhost`, `127.0.0.0/8`, `[::1]`), for a local API in development. A malformed target with `apiBaseUrl` set answers 400 instead of throwing.

## [0.21.0] - 2026-10-08

Breaking: `AgentClient.http` requires `fetch`, the `AppTag*` constants are removed, and `StreamableManagerOptions` is a type alias. See Changed and Removed.

### Added

- `HttpClient.fetch(endpoint, init?)`: fetches an endpoint with the client's auth, headers and credentials mode and resolves with the raw `Response`, for bodies `request()` does not parse (streams, text). A refused response throws the error `request()` would (`InferenceError`, `RequirementsNotMetException`). Type `HttpFetchInit`.
- `StreamRequest` and `StreamRequestInit`: a function that sends a stream's request. `StreamableManager` takes `{ request }` in place of `{ url, headers, credentials }`, and `streamable()` / `streamableRaw()` take one in place of the URL. With `(init) => http.fetch(endpoint, init)` the stream carries the token of the moment it connects and a refusal goes through `onError`. Type `StreamableSource`.
- `onError` gets a third argument, `FailedRequest` (`{ token }`): the bearer token the failed request carried, so a handler that refreshes credentials can tell a request sent before the refresh from one sent after it.
- `getToken` may be async (`() => string | null | undefined | Promise<string | null | undefined>`). `request()`, `fetch()` and the EventSource handshake wait for it.
- `HttpClient.request()` takes `handleErrors` (default `true`). With `handleErrors: false` the caller handles the request's failure itself: `onError` is not called for it, nothing is retried, and the error is thrown as it is.

- Types: `StoreCategoryDTO` and `StoreTagDTO` (`GET /store/categories`, `GET /store/tags`); the decision app contract (`DecisionInput`, `DecisionVisionInput`, `DecisionOutput` and its question and answer types); `ErrorCodeImpersonationReasonRequired`.

### Changed

- `AgentClient.http` requires `fetch` and no longer requires `getStreamableConfig`. A hand-built `AgentClient` must add `http.fetch`; `Inference` and `HttpClient` already have it.
- The streams the SDK opens itself (`tasks.run()` and `tasks.watch()`, `Agent` chat streams, the agent chat in `@inferencesh/sdk/agent`) go through `HttpClient.fetch`. A stream the api refuses now reaches `onError` like a refused request, and fails with an `InferenceError` (`statusCode`, `responseBody`) where it failed with `Error('HTTP <status>: <body>')`.
- A request that got no response (the network failed) goes to `onError` from `fetch()` and the EventSource handshake too, as it already did from `request()`. The failure is thrown unless the handler's retry resolves with a response. A request aborted through its signal is not handed to `onError`.
- The EventSource handshake and `fetch()` take what `onError` resolves with only when it is a `Response`; anything else leaves the refused response in place.
- `StreamableManagerOptions` is a type alias (`StreamableSource & { ... }`), no longer an interface: it cannot be extended with `interface X extends StreamableManagerOptions<T>`; use an intersection.

### Removed

- The `AppTag*` constants (`AppTagTextToImage` and the rest). App tags come from the store: `GET /store/tags`, typed `StoreTagDTO`.

### Deprecated

- `HttpClient.getStreamableConfig()`: a request made from the config bypasses `onError` and carries the token of the moment the config was read. Use `fetch()` or a `StreamRequest`. It throws when `getToken` is async.

## [0.20.1] - 2026-10-08

### Added

- Types: app tags and the decision app category.

## [0.20.0] - 2026-10-07

### Added

- `tasks.files(id)`, `tasks.deleteFiles(id)` and `tasks.delete(id, { files })`: list a task's files and delete them with or without the task.
- Types: task files, MCP Apps (`_meta.ui`, `AppUIRef`, the MCP tool call UI fields), remote tags and policy rules, `AppDTO.resolved_function`, `DescriptionLimit`.

### Changed

- Types: forms lose the bounty and reward fields; a bounty's proof form drops `proof_min_length`.

### Security

- `next` ^16.3.6 (resolves 16.3.8) for GHSA-vcvr-r3jv-pc5j.

## [0.19.0] - 2026-10-04

### Changed

- Types regenerated; the run parameters docs drop `params.variant`.

## [0.18.0] - 2026-10-04

### Added

- `AgentPermissions` and `permissions` on agent configs: what an agent's new chats may do without asking (`allow_all_tools`).
- `PolicyKind` (`RemoteExec`, `Workspace`, `Harness`, `Tool`, `WebFetch`, and the usage kinds `App`, `Agent`, `Knowledge`, `Mcp`, `Flow`) with its constants. `PolicyRuleDTO.kind` is a `PolicyKind`.

### Removed

- `ChatData.always_allowed_tools`. A chat's always-allow list became chat rules (`GET /chats/{id}/rules`); the api no longer sends it.
- `TeamDTO.usage_policy_id`. A workspace's usage policy is a policy attached to it; the org's workspace list carries it.

## [0.17.0] - 2026-10-02

### Changed

- `updateChatSettings` and `switchAgent` merge what the api now answers with into the chat they hold: `ChatSettingsDTO` (`chat_id`, `name`, `visibility`, `allow_all_tools`, `disable_hooks`, `memory`) from `POST /chats/{id}/settings` and `ChatAgentDTO` (`chat_id`, `agent_id`, `agent`, `agent_version_id`, `agent_version`) from `POST /chats/{id}/agent`. The reducer has `MERGE_CHAT_SETTINGS` and `MERGE_CHAT_AGENT` for them; a response for a chat other than the one on screen is ignored. The low-level `updateChatSettings` and `setAgent` in the agent api return those types. Needs an api that answers with them.
- `ChatDTO.chat_messages` is optional: the api leaves it out when it did not load the messages, which it never does on the chat endpoints. Read messages from `GET /chats/{id}/messages`.

### Fixed

- Polling `sendMessage` handled a fetched chat with an unchanged status only when it carried `chat_messages`. It now skips only the poll's own "nothing changed" answer.

## [0.16.0] - 2026-10-02

### Added

- `useAgentActions().getAlwaysAllowOptions(toolInvocationId)`: what "always allow" can save for a call awaiting approval, narrowest first, computed by the api (`GET /chats/{id}/tools/{toolId}/always-allow/options`). Each option has a `key`, a `scope` (`exact`, `prefix`, `folder`, `remote`, `tool`), a `label` such as "npm run commands on laptop", and the chat `rules` it saves; `default` is the narrowest that answers the call again, and `unavailable` says why there are none.
- `useAgentActions().explainTool(toolInvocationId)`: a plain-words explanation of a call awaiting approval, `{ risk_level: 'low' | 'medium' | 'high', explanation, reasoning, risk }` (`POST /chats/{id}/tools/{toolId}/explain`). A model writes it the first time it is asked for and the api keeps it for the call; call it only when the person asks.
- Types: `ToolExplanationDTO`, `ToolRiskLevel`, `AlwaysAllowOptionsDTO`, `AlwaysAllowOptionDTO`, `AlwaysAllowScope`, `AlwaysAllowRequest`, `AlwaysAllowResultDTO`, `PolicyRuleDTO` (with `label`), `AlwaysAllowChoice`.

### Changed

- `useAgentActions().alwaysAllowTool(toolInvocationId, { option })` saves the chosen option and resolves to the saved rules. The second argument used to be the tool name; a string is still accepted and means the api's default. A 409 (stale option) or 400 rejects without putting the chat in the error state.

### Security

- `proxy-addr` 2.0.8 in the lockfile (CVE-2026-90711).

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

