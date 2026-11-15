#!/bin/bash
set -euo pipefail

# Upload build artifacts to the console backend.
# Usage: upload-artifacts.sh <backend-url> <build-token> <artifact-dir>
# Arguments:
#   backend-url:  Backend URL (base path for upload endpoint)
#   build-token: Token authenticating the upload request
#   artifact-dir: Directory containing build artifacts to upload

BACKEND_URL="${1:?backend-url required}"
BUILD_TOKEN="${2:?build-token required}"
ARTIFACT_DIR="${3:?artifact-dir required}"

FILES_ARGS=()
for f in "$ARTIFACT_DIR"/*; do
  [ -f "$f" ] && FILES_ARGS+=(-F "files=@$f")
done

if [ "${#FILES_ARGS[@]}" -eq 0 ]; then
  echo "No artifact files found in $ARTIFACT_DIR"
  exit 0
fi

curl -fsS -X POST "${BACKEND_URL}/upload" \
  -H "X-Build-Token: ${BUILD_TOKEN}" \
  "${FILES_ARGS[@]}"