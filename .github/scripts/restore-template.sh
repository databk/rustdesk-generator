#!/bin/bash
set -euo pipefail

# Restore template from GitHub Release for template-patch builds.
# Calculates git tree hash (after public key injection), determines
# the Release tag, and downloads template files if available.
#
# Usage: restore-template.sh <version> <os> <arch> <output-dir>
# Arguments:
#   version:    RustDesk version (e.g. 1.5.1)
#   os:         OS/platform (e.g. windows, macos, linux, android, ios)
#   arch:       Architecture (e.g. x86_64, aarch64)
#   output-dir: Directory to download template files into
# Exit codes:
#   0 - Template restored successfully
#   1 - Template not found (need full build)

VERSION="${1:?version required}"
OS="${2:?os required}"
ARCH="${3:?arch required}"
OUTPUT_DIR="${4:?output-dir required}"

# Calculate tree hash excluding non-RustDesk-source directories
# (generator-scripts, custom-config, template-cache) so that the cache
# key is stable across platforms and runs regardless of generator repo
# version or custom client config content.
TREE_HASH=$(git add -A -- ':!generator-scripts' ':!custom-config' ':!template-cache' && git write-tree)
TAG="template-${VERSION}-${TREE_HASH:0:7}"

echo "Tree hash: ${TREE_HASH}"
echo "Template tag: ${TAG}"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "tree-hash=${TREE_HASH}" >> "${GITHUB_OUTPUT}"
  echo "template-tag=${TAG}" >> "${GITHUB_OUTPUT}"
fi

mkdir -p "${OUTPUT_DIR}"

ASSET_PATTERN="rustdesk-template-${OS}-${ARCH}*"
if gh release download "${TAG}" -R "${GITHUB_REPOSITORY}" -D "${OUTPUT_DIR}" -p "${ASSET_PATTERN}" --clobber 2>/dev/null; then
  echo "Restored: rustdesk-template-${OS}-${ARCH}"
else
  echo "Not found: rustdesk-template-${OS}-${ARCH}"
  rm -rf "${OUTPUT_DIR}"
  exit 1
fi

BUILD_ARCHIVE="${OUTPUT_DIR}/rustdesk-template-${OS}-${ARCH}.tar.gz"
if [ -f "${BUILD_ARCHIVE}" ]; then
  tar xzf "${BUILD_ARCHIVE}" -C .
  echo "Extracted build directory"
fi
