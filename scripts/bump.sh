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

# Update package.json AND package-lock.json.
#
# npm version updates both (it does not run an install, so the dependency
# tree is untouched — only the version fields change). Writing package.json
# alone leaves the lockfile on the previous version, and `npm ci` refuses to
# run when the two disagree:
#   npm error EUSAGE ... package.json and package-lock.json are not in sync
# which fails the publish workflow on every release.
npm version "$new_version" --no-git-tag-version --allow-same-version >/dev/null

# Keep X-Client-Source header in sync with package version
sed -i "s|inference-sdk-js/[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*|inference-sdk-js/$new_version|g" src/http/client.ts

git add package.json package-lock.json src/http/client.ts
git commit -m "chore: bump version to $new_tag"
git tag "$new_tag"
echo "Tagged $new_tag (run make release to publish)"
