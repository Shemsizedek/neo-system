#!/usr/bin/env bash
set -euo pipefail

echo "[NEO Mail Lab] Preparing Codespaces development environment"
mkdir -p "$HOME/neomail-lab"

if command -v docker >/dev/null 2>&1; then
  docker version || true
  docker compose version || true
fi

cat <<'EOF'
NEO Mail Codespaces role:
- reproducible development/test environment only
- NOT authoritative production MX
- NOT stable Node A
- no production MX changes
- no private keys/API secrets committed to GitHub

Use:
  docker compose -f infra/neomail-staging/docker-compose.codespaces.yml up -d

SentinelX may be enrolled in this Codespace for temporary management/testing,
but the enrollment should be treated as ephemeral and separate from the
permanent Node A identity.
EOF
