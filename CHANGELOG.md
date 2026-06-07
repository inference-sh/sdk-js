# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

