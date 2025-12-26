#!/bin/sh

set -e

version=$(git describe --tags --abbrev=0 | sed 's/^v//')
IFS='.' read -r major minor patch <<EOF
$version
EOF

case "$1" in
  major) major=$((major + 1)); minor=0; patch=0 ;;
  minor) minor=$((minor + 1)); patch=0 ;;
  patch) patch=$((patch + 1)) ;;
  *) echo "Usage: $0 {major|minor|patch}"; exit 1 ;;
esac

new_version="$major.$minor.$patch"
new_tag="v$new_version"

# Update version in package.json
sed -i "s/\"version\": \".*\"/\"version\": \"${new_version}\"/" package.json

# Commit both version bump and package.json change
git add package.json
git commit -m "chore: bump version to $new_tag"
git tag "$new_tag"
git push origin HEAD "$new_tag"
echo "Bumped to $new_tag"

