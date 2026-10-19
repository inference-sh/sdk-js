#!/bin/sh
set -e

# The current version is package.json's, never a tag's: this repo also carries
# the app-v* release tags, which git describe and svu would read instead.
version=$(node -p "require('./package.json').version")
major=$(echo "$version" | cut -d. -f1)
minor=$(echo "$version" | cut -d. -f2)
patch=$(echo "$version" | cut -d. -f3)
case "$1" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
  *) echo "Usage: $0 {major|minor|patch}"; exit 1 ;;
esac
new_version="$major.$minor.$patch"
new_tag="v$new_version"

# package.json is the only place the version lives: src/version.ts imports
# it, and pnpm-lock.yaml does not record it.
npm version "$new_version" --no-git-tag-version --allow-same-version >/dev/null

git add package.json
git commit -m "chore: bump version to $new_tag"
git tag "$new_tag"
echo "Tagged $new_tag (run make release to publish)"
