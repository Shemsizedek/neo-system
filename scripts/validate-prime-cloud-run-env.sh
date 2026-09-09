#!/usr/bin/env bash
set -euo pipefail

GCP_PROJECT_ID="neo-test-project"
GCP_REGION="us-central1"
ENV_FLAG='--set-env-vars=^@^NEO_PRIME_ALLOWED_ORIGINS=https://shemsizedek.github.io,https://holytemples.org,https://www.holytemples.org,https://oracle.holytemples.org@GOOGLE_CLOUD_PROJECT='"$GCP_PROJECT_ID"'@GOOGLE_CLOUD_LOCATION='"$GCP_REGION"'@VERTEX_GEMINI_MODEL=gemini-2.5-flash'

[[ "$ENV_FLAG" == *'^@^'* ]]
[[ "$ENV_FLAG" == *'NEO_PRIME_ALLOWED_ORIGINS=https://shemsizedek.github.io,https://holytemples.org,https://www.holytemples.org,https://oracle.holytemples.org@GOOGLE_CLOUD_PROJECT=neo-test-project'* ]]
[[ "$ENV_FLAG" == *'@GOOGLE_CLOUD_LOCATION=us-central1@VERTEX_GEMINI_MODEL=gemini-2.5-flash'* ]]

echo "Cloud Run env delimiter validation passed."
