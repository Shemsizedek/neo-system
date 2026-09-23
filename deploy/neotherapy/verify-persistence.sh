#!/usr/bin/env bash
set -euo pipefail
: "${NEOTHERAPY_BASE_URL:?Set NEOTHERAPY_BASE_URL}"
curl -fsS "$NEOTHERAPY_BASE_URL/api/neotherapy-storage?action=status"
echo
echo "Then write a non-sensitive test record, redeploy/restart, and verify the same record remains before UI cutover."
