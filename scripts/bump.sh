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

# Keep package.json and src/version.ts in sync; pnpm-lock.yaml does not
# record the version so there is nothing else to update.
npm version "$new_version" --no-git-tag-version --allow-same-version >/dev/null

# Update the SDK_VERSION constant used in the X-Client-Source telemetry header.
# -i.bak works with both GNU and BSD sed.
sed -i.bak "s/export const SDK_VERSION = '.*'/export const SDK_VERSION = '$new_version'/" src/version.ts
rm -f src/version.ts.bak

git add package.json src/version.ts
git commit -m "chore: bump version to $new_tag"
git tag "$new_tag"
echo "Tagged $new_tag (run make release to publish)"
