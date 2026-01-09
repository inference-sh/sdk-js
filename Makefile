# SDK-JS Makefile
#
# Usage:
#   make test API_KEY=your-api-key    # Run integration tests
#   make help                          # Show all targets
#
# Or export INFERENCE_API_KEY and just run: make test

API_KEY ?= $(INFERENCE_API_KEY)
BASE_URL ?= $(INFERENCE_BASE_URL)

# =============================================================================
# Setup & Build
# =============================================================================

.PHONY: install build clean

install:
	npm install

build:
	npm run build

clean:
	npm run clean

# =============================================================================
# Tests
# =============================================================================

.PHONY: unit-test test test-dev

# Unit tests (mocked, no API key needed)
unit-test:
	npm test

# Integration tests via Jest (requires API key)
test: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) npm run test:integration

# Integration tests against dev API
test-dev: check-key build
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=https://api-dev.inference.sh npm run test:integration

# =============================================================================
# Examples (for manual testing/demos)
# =============================================================================

.PHONY: example

# Run a specific example: make example NAME=basic
# Available: basic, with-updates, fire-and-forget, batch-processing, tool-builder, agent-chat, agent-template
example: check-key build
ifndef NAME
	@echo "Usage: make example NAME=<example-name>"
	@echo "Available examples: basic, with-updates, fire-and-forget, batch-processing"
	@echo "                    tool-builder, agent-chat, agent-template"
else
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) node examples/$(NAME).cjs 2>/dev/null || \
	INFERENCE_API_KEY=$(API_KEY) INFERENCE_BASE_URL=$(BASE_URL) npx ts-node examples/$(NAME).ts
endif

# =============================================================================
# Code Quality
# =============================================================================

.PHONY: lint format

lint:
	npm run lint

format:
	npm run format

# =============================================================================
# Helpers
# =============================================================================

check-key:
ifndef API_KEY
	$(error API_KEY is not set. Use: make <target> API_KEY=your-key or export INFERENCE_API_KEY)
endif
ifeq ($(strip $(API_KEY)),)
	$(error API_KEY is empty. Use: make <target> API_KEY=your-key or export INFERENCE_API_KEY)
endif

.PHONY: help
help:
	@echo "SDK-JS Makefile"
	@echo ""
	@echo "Usage: make <target> [API_KEY=your-key]"
	@echo ""
	@echo "Setup:"
	@echo "  install        Install dependencies"
	@echo "  build          Build the SDK"
	@echo "  clean          Clean build artifacts"
	@echo ""
	@echo "Tests:"
	@echo "  unit-test      Run unit tests (no API key needed)"
	@echo "  test           Run Jest integration tests"
	@echo "  test-dev       Run integration tests against dev API"
	@echo ""
	@echo "Examples:"
	@echo "  example NAME=basic    Run a specific example"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint           Run ESLint"
	@echo "  format         Format with Prettier"

.DEFAULT_GOAL := help
