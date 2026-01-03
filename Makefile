# SDK-JS Integration Tests / Examples Makefile
# 
# Usage:
#   make test API_KEY=your-api-key              # Run all integration tests
#   make example-basic API_KEY=your-api-key    # Run specific example
#   make help                                   # Show all targets
#
# You can also export INFERENCE_API_KEY instead of passing API_KEY

# API key - can be passed as make arg or set as env var
API_KEY ?= $(INFERENCE_API_KEY)
BASE_URL ?= $(INFERENCE_BASE_URL)

# Ensure API key is set for targets that need it
check-key:
ifndef API_KEY
	$(error API_KEY is not set. Use: make <target> API_KEY=your-key or export INFERENCE_API_KEY)
endif

# Build the SDK
.PHONY: build
build:
	npm run build

# Install dependencies
.PHONY: install
install:
	npm install

# Run unit tests (no API key needed)
.PHONY: unit-test
unit-test:
	npm test

# =============================================================================
# Integration Tests (Examples) - Require API Key
# =============================================================================

# Run all integration tests
.PHONY: test integration
test integration: check-key build
	@echo "Running all integration tests..."
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/_local-test.cjs

# Run integration tests against dev API
.PHONY: test-dev
test-dev: check-key build
	@echo "Running integration tests against api-dev..."
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=https://api-dev.inference.sh node examples/_local-test.cjs

# Run basic example
.PHONY: example-basic
example-basic: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/basic.cjs

# Run with-updates example  
.PHONY: example-updates
example-updates: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/with-updates.cjs

# Run fire-and-forget example
.PHONY: example-fire
example-fire: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/fire-and-forget.cjs

# Run batch-processing example
.PHONY: example-batch
example-batch: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/batch-processing.cjs

# Run tool-builder example (TypeScript)
.PHONY: example-tool-builder
example-tool-builder: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) npx ts-node examples/tool-builder.ts

# Run agent-chat example (TypeScript)
.PHONY: example-agent
example-agent: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) npx ts-node examples/agent-chat.ts

# Run agent-template example (TypeScript)
.PHONY: example-agent-template
example-agent-template: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) npx ts-node examples/agent-template.ts

# =============================================================================
# Local test runner specific tests
# =============================================================================

# Run local test - basic
.PHONY: local-basic
local-basic: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/_local-test.cjs basic

# Run local test - with updates
.PHONY: local-updates
local-updates: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/_local-test.cjs updates

# Run local test - fire and forget
.PHONY: local-fire
local-fire: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/_local-test.cjs fire

# =============================================================================
# Utilities
# =============================================================================

# Clean build artifacts
.PHONY: clean
clean:
	npm run clean

# Lint code
.PHONY: lint
lint:
	npm run lint

# Format code
.PHONY: format
format:
	npm run format

# Help
.PHONY: help
help:
	@echo "SDK-JS Makefile - Integration Tests & Examples"
	@echo ""
	@echo "Usage: make <target> API_KEY=your-api-key"
	@echo "       Or export INFERENCE_API_KEY and just run: make <target>"
	@echo ""
	@echo "Build & Setup:"
	@echo "  install             Install npm dependencies"
	@echo "  build               Build the SDK"
	@echo "  clean               Clean build artifacts"
	@echo ""
	@echo "Unit Tests (no API key needed):"
	@echo "  unit-test           Run Jest unit tests"
	@echo ""
	@echo "Integration Tests (require API key):"
	@echo "  test / integration  Run all integration tests"
	@echo "  example-basic       Run basic.cjs example"
	@echo "  example-updates     Run with-updates.cjs example"
	@echo "  example-fire        Run fire-and-forget.cjs example"
	@echo "  example-batch       Run batch-processing.cjs example"
	@echo "  example-tool-builder Run tool-builder.ts example"
	@echo "  example-agent       Run agent-chat.ts example"
	@echo "  example-agent-template Run agent-template.ts example"
	@echo ""
	@echo "Local Test Runner:"
	@echo "  local-basic         Run _local-test.cjs basic test"
	@echo "  local-updates       Run _local-test.cjs updates test"
	@echo "  local-fire          Run _local-test.cjs fire test"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint                Run ESLint"
	@echo "  format              Format code with Prettier"
	@echo ""
	@echo "Environment Variables:"
	@echo "  API_KEY / INFERENCE_API_KEY   Your inference.sh API key"
	@echo "  BASE_URL / INFERENCE_BASE_URL Optional: API base URL"

.DEFAULT_GOAL := help

