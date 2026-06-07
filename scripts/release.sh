#!/bin/bash
set -e

# Ensure we're on main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "Please switch to main branch first"
    exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "Working directory is not clean. Please commit or stash changes first."
    exit 1
fi

# Get the latest tag
LATEST_TAG=$(git describe --tags --abbrev=0)

# Verify versions match
VERSION=${LATEST_TAG#v}
PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [ "$VERSION" != "$PACKAGE_VERSION" ]; then
    echo "Error: Version mismatch!"
    echo "Git tag: $VERSION"
    echo "package.json: $PACKAGE_VERSION"
    exit 1
fi

# Create GitHub release
echo "Creating GitHub release..."
gh release create "${LATEST_TAG}" \
    --title "Release ${LATEST_TAG}" \
    --generate-notes

echo "Released ${LATEST_TAG} successfully!"
echo "The npm package will be published automatically by the GitHub workflow."

