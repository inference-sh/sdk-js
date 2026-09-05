#!/bin/sh
set -e

# Get new version via svu or manual bump
if command -v svu >/dev/null 2>&1; then
  new_tag=$(svu "$1")
else
  if git describe --tags --abbrev=0 > /dev/null 2>&1; then
    version=$(git describe --tags --abbrev=0 | sed 's/^v//')
  else
    version=$(node -p "require('./package.json').version")
  fi
  major=$(echo "$version" | cut -d. -f1)
  minor=$(echo "$version" | cut -d. -f2)
  patch=$(echo "$version" | cut -d. -f3)
  case "$1" in
    major) major=$((major + 1)); minor=0; patch=0 ;;
    minor) minor=$((minor + 1)); patch=0 ;;
    patch) patch=$((patch + 1)) ;;
    *) echo "Usage: $0 {major|minor|patch}"; exit 1 ;;
  esac
  new_tag="v$major.$minor.$patch"
fi

new_version="${new_tag#v}"

# Only package.json carries the version; pnpm-lock.yaml does not record it, so
# there is nothing else to keep in sync.
npm version "$new_version" --no-git-tag-version --allow-same-version >/dev/null

git add package.json
git commit -m "chore: bump version to $new_tag"
git tag "$new_tag"
echo "Tagged $new_tag (run make release to publish)"
