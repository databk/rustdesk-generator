#!/bin/bash
set -euo pipefail

# Notify the backend about the build result.
# Usage: notify-build-result.sh <backend-url> <callback-token> <status> [message] [artifact-dir]
# Arguments:
#   backend-url:    Backend URL (base path for callback and config endpoints)
#   callback-token: Token authenticating the POST to the backend
#   status:         "completed" or "failed"
#   message:        Optional message (use "" for no message)
#   artifact-dir:   Optional directory containing build artifacts to upload

BACKEND_URL="${1:?backend-url required}"
CALLBACK_TOKEN="${2:?callback-token required}"
STATUS="${3:?status required}"
MESSAGE="${4:-}"
ARTIFACT_DIR="${5:-}"

if [ "$STATUS" = "failed" ]; then
  curl -fsS -X POST "${BACKEND_URL}/callback" \
    -H "X-Callback-Token: ${CALLBACK_TOKEN}" \
    -F "status=failed" \
    -F "message=${MESSAGE}" || true
  exit 0
fi

if [ -z "$ARTIFACT_DIR" ] || [ ! -d "$ARTIFACT_DIR" ]; then
  curl -fsS -X POST "${BACKEND_URL}/callback" \
    -H "X-Callback-Token: ${CALLBACK_TOKEN}" \
    -F "status=completed" || true
  exit 0
fi

FILES_ARGS=()
for f in "$ARTIFACT_DIR"/*; do
  [ -f "$f" ] && FILES_ARGS+=(-F "files=@$f")
done

if [ "${#FILES_ARGS[@]}" -eq 0 ]; then
  curl -fsS -X POST "${BACKEND_URL}/callback" \
    -H "X-Callback-Token: ${CALLBACK_TOKEN}" \
    -F "status=failed" \
    -F "message=No artifact files found" || true
  exit 0
fi

curl -fsS -X POST "${BACKEND_URL}/callback" \
  -H "X-Callback-Token: ${CALLBACK_TOKEN}" \
  -F "status=completed" \
  "${FILES_ARGS[@]}"