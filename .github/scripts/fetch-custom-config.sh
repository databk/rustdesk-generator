#!/bin/bash
set -euo pipefail

# Fetch custom client configuration from the console API.
# Usage: fetch-custom-config.sh <backend-url> <callback-token> <output-dir>
# Outputs:
#   <output-dir>/custom.txt          - signed custom.txt content
#   <output-dir>/public-key.txt      - base64 public key for sed replacement
#   <output-dir>/logos/              - downloaded logo files

BACKEND_URL="${1:?backend-url required}"
CONFIG_URL="${BACKEND_URL}/config"
CALLBACK_TOKEN="${2:?callback-token required}"
OUTPUT_DIR="${3:?output-dir required}"

mkdir -p "${OUTPUT_DIR}/logos"

# Fetch build config (custom.txt, public key, logo list)
CONFIG_RESPONSE=$(curl -fsS -H "X-Callback-Token: ${CALLBACK_TOKEN}" "${CONFIG_URL}")

# Extract custom.txt content
CUSTOM_TXT=$(echo "${CONFIG_RESPONSE}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('customTxt',''))")
if [ -n "${CUSTOM_TXT}" ]; then
  echo -n "${CUSTOM_TXT}" > "${OUTPUT_DIR}/custom.txt"
  echo "custom.txt written (${#CUSTOM_TXT} bytes)"
else
  echo "No custom.txt content received"
fi

# Extract public key
PUBLIC_KEY=$(echo "${CONFIG_RESPONSE}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('publicKey',''))")
if [ -n "${PUBLIC_KEY}" ]; then
  echo -n "${PUBLIC_KEY}" > "${OUTPUT_DIR}/public-key.txt"
  echo "Public key: ${PUBLIC_KEY}"
else
  echo "No public key received"
fi

# Extract logo list and download each logo
LOGOS=$(echo "${CONFIG_RESPONSE}" | python3 -c "import json,sys; logos=json.load(sys.stdin).get('logos',[]); print('\n'.join(logos))")
if [ -n "${LOGOS}" ]; then
  for LOGO in ${LOGOS}; do
    LOGO_URL="${BACKEND_URL}/logo/${LOGO}"
    curl -fsS -H "X-Callback-Token: ${CALLBACK_TOKEN}" -o "${OUTPUT_DIR}/logos/${LOGO}" "${LOGO_URL}"
    echo "Downloaded logo: ${LOGO}"
  done
else
  echo "No logos to download"
fi