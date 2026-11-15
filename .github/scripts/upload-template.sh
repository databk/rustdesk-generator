#!/bin/bash
set -euo pipefail

# Upload template files to GitHub Release for template-patch builds.
# Creates the Release if it doesn't exist, then uploads template files.
#
# Usage: upload-template.sh <version> <tree-hash> <files...>
# Arguments:
#   version:   RustDesk version (e.g. 1.5.1)
#   tree-hash: Git tree hash after injecting public key (full hash)
#   files:     Template files to upload

VERSION="${1:?version required}"
TREE_HASH="${2:?tree-hash required}"
shift 2
FILES=("$@")

TAG="template-${VERSION}-${TREE_HASH:0:7}"

if ! gh release view "${TAG}" -R "${GITHUB_REPOSITORY}" >/dev/null 2>&1; then
  gh release create "${TAG}" -R "${GITHUB_REPOSITORY}" \
    --title "Templates for ${VERSION} (${TREE_HASH:0:7})" \
    --notes "Auto-generated template build"
  echo "Created Release: ${TAG}"
fi

for FILE in "${FILES[@]}"; do
  if [ -f "${FILE}" ]; then
    gh release upload "${TAG}" -R "${GITHUB_REPOSITORY}" "${FILE}" --clobber
    echo "Uploaded: $(basename "${FILE}")"
  else
    echo "Warning: file not found: ${FILE}"
  fi
done
