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

# Integration tests against dev API (uses dev seed key by default)
DEV_API_KEY ?= 1nfsh-dev-0000000000000000000
test-dev: build
	INFERENCE_API_KEY=$(DEV_API_KEY) INFERENCE_BASE_URL=https://api-dev.inference.sh npm run test:integration

# Integration tests against local dev API
test-local: build
	INFERENCE_API_KEY=$(DEV_API_KEY) INFERENCE_BASE_URL=http://localhost:3021 npm run test:integration

# =============================================================================
# Examples (for manual testing/demos)
# =============================================================================

.PHONY: example

# Run a specific example: make example NAME=basic
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
# Version & Release
# =============================================================================

.PHONY: patch minor major release

# Regenerate package-lock.json with the pinned node, never the ambient one.
#
# .mise.toml pins node 24, which is what npm-publish.yml runs. Generating the
# lockfile under a different node (e.g. nvm's default) resolves optional
# platform deps differently, and `npm ci` then fails with
#   npm error EUSAGE ... Missing: @emnapi/runtime@x.y.z from lock file
# even though it passed locally. Use this target after changing dependencies.
# Generates in a clean temp dir: inside the pnpm workspace, npm reads pnpm's
# node_modules layout and writes a lockfile with only the direct deps, which
# then fails `npm ci` in CI.
relock:
	mise install
	@tmp=$$(mktemp -d) && cp package.json .mise.toml "$$tmp/" && cd "$$tmp" && \
		mise trust -q && mise exec -- npm install --package-lock-only --ignore-scripts && \
		cp package-lock.json "$(CURDIR)/package-lock.json" && rm -rf "$$tmp"
	@echo "Lockfile regenerated with $$(mise exec -- node -v)"

patch:
	@./scripts/bump.sh patch

minor:
	@./scripts/bump.sh minor

major:
	@./scripts/bump.sh major

# Push and create GitHub release (triggers npm publish via CI)
release:
	@VERSION=$$(git describe --tags --abbrev=0) && \
	git push origin HEAD "$$VERSION" && \
	gh release create "$$VERSION" --title "$$VERSION" --generate-notes && \
	echo "Released $$VERSION"

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
	@echo "Release:"
	@echo "  patch          Bump patch version"
	@echo "  minor          Bump minor version"
	@echo "  major          Bump major version"
	@echo "  release        Create GitHub release (triggers npm publish)"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint           Run ESLint"
	@echo "  format         Format with Prettier"

.DEFAULT_GOAL := help

