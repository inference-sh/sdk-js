# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/inference-sh/sdk-js/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/inference-sh/sdk-js/releases/tag/v0.1.0

