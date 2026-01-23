#!/bin/bash
# ============================================================================
# Release Script for @inferencesh/sdk
# ============================================================================
#
# This script automates the release process:
# 1. Validates prerequisites (branch, clean state, gh CLI)
# 2. Bumps version in package.json
# 3. Creates git tag
# 4. Creates GitHub release (which triggers npm publish via GitHub Actions)
#
# Usage:
#   ./scripts/release.sh [major|minor|patch]
#   ./scripts/release.sh patch   # e.g., 0.4.2 -> 0.4.3
#   ./scripts/release.sh minor   # e.g., 0.4.2 -> 0.5.0
#   ./scripts/release.sh major   # e.g., 0.4.2 -> 1.0.0
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# ============================================================================
# Validate Arguments
# ============================================================================

BUMP_TYPE="${1:-patch}"

if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
    log_error "Invalid bump type: $BUMP_TYPE"
    echo "Usage: $0 [major|minor|patch]"
    exit 1
fi

log_info "Release type: $BUMP_TYPE"

# ============================================================================
# Prerequisites Check
# ============================================================================

echo ""
log_info "Checking prerequisites..."

# Check for required tools
if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) is not installed. Install it from https://cli.github.com/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "npm is not installed."
    exit 1
fi

# Check gh authentication
if ! gh auth status &> /dev/null; then
    log_error "Not authenticated with GitHub CLI. Run 'gh auth login' first."
    exit 1
fi

log_success "Prerequisites satisfied"

# ============================================================================
# Git State Validation
# ============================================================================

echo ""
log_info "Validating git state..."

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    log_error "Not on main branch. Current branch: $CURRENT_BRANCH"
    echo "Please switch to main: git checkout main"
    exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    log_error "Working directory is not clean"
    echo "Please commit or stash your changes first."
    git status --short
    exit 1
fi

# Ensure we're up to date with remote
git fetch origin main --quiet
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
    log_error "Local branch is not up to date with origin/main"
    echo "Please pull the latest changes: git pull origin main"
    exit 1
fi

log_success "Git state validated"

# ============================================================================
# Run Tests
# ============================================================================

echo ""
log_info "Running tests..."

npm test --silent

log_success "All tests passed"

# ============================================================================
# Version Bump
# ============================================================================

echo ""
log_info "Bumping version ($BUMP_TYPE)..."

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "Current version: v$CURRENT_VERSION"

# ============================================================================
# Create GitHub Release
# ============================================================================

echo ""
log_info "Creating GitHub release..."

gh release create "v$CURRENT_VERSION" \
    --title "v$CURRENT_VERSION" \
    --generate-notes

log_success "GitHub release created"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Release v$CURRENT_VERSION completed successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "The GitHub Actions workflow will now:"
echo "  1. Run tests"
echo "  2. Build the package"
echo "  3. Publish to npm with provenance"
echo ""
echo "Monitor the release at:"
echo "  https://github.com/inference-sh/sdk-js/actions"
echo ""
