#!/usr/bin/env bash
# NET-006: authorized, READ-ONLY inspection of existing GCP VPN Node 001.
# No IAM changes, API enablement, VM creation, firewall writes or Terraform apply.
set -euo pipefail

if ! command -v gcloud >/dev/null 2>&1; then
  echo "NET006=UNVERIFIED (gcloud not installed)" >&2
  exit 2
fi
if ! command -v node >/dev/null 2>&1; then
  echo "NET006=UNVERIFIED (Node.js not installed)" >&2
  exit 2
fi

PROJECT="${1:-${GCP_PROJECT_ID:-}}"
if [[ -z "$PROJECT" ]]; then
  PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
fi
if [[ -z "$PROJECT" || "$PROJECT" == "(unset)" ]]; then
  echo "NET006=UNVERIFIED (select an authorized existing GCP project)" >&2
  exit 2
fi

# One explicitly selected project only; never scan the user's other projects.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
umask 077
echo "GLOBAL-NEO-IP-NET-006 read-only existing VPN discovery"
echo "Project scope: existing operator-selected project; no cloud mutations."

if ! gcloud projects describe "$PROJECT" --format='value(projectNumber)' >"$TMP/project-number" 2>"$TMP/project-error"; then
  echo "PROJECT_ACCESS=UNVERIFIED_OR_DENIED"
  exit 3
fi
PROJECT_NUMBER="$(cat "$TMP/project-number")"
if [[ ! "$PROJECT_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "PROJECT_NUMBER=INVALID"
  exit 3
fi
echo "PROJECT_ACCESS=VERIFIED"

# Obtain inventory even if GitHub's WIF provider is absent: this is the independent path.
if ! gcloud compute instances list --project="$PROJECT" --filter='name=neo-vpn-node-001' --format=json >"$TMP/instances.json" 2>"$TMP/instances-error"; then
  echo "COMPUTE_INVENTORY=UNVERIFIED_OR_DENIED"
  echo "NODE_LIVE=NOT_CERTIFIED"
  exit 4
fi
if ! gcloud compute addresses list --project="$PROJECT" --format=json >"$TMP/addresses.json" 2>"$TMP/addresses-error"; then
  echo "ADDRESS_INVENTORY=UNVERIFIED_OR_DENIED"
  echo "NODE_LIVE=NOT_CERTIFIED"
  exit 4
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
node "$ROOT/services/neo-vpn/diagnostics/gcp-inventory-report.mjs" "$TMP/instances.json" "$TMP/addresses.json"

# Existing defaults from configure-wif.sh. No identity resources are created.
POOL_ID="${NEO_VPN_WIF_POOL_ID:-github}"
PROVIDER_ID="${NEO_VPN_WIF_PROVIDER_ID:-neo-system}"
SERVICE_ACCOUNT="${NEO_VPN_GCP_SERVICE_ACCOUNT:-neo-vpn-deployer@$PROJECT.iam.gserviceaccount.com}"
WIF_RESOURCE="projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"

if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --project="$PROJECT" --location=global --workload-identity-pool="$POOL_ID" --format=json >"$TMP/provider.json" 2>"$TMP/provider-error"; then
  if node - "$TMP/provider.json" <<'NODE'
const fs = require('node:fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const condition = String(p.attributeCondition || '');
const authorized = p.state === 'ACTIVE' && p.disabled !== true &&
  condition.includes('Shemsizedek/neo-system') &&
  condition.includes('refs/heads/main');
process.exit(authorized ? 0 : 1);
NODE
  then
    echo "WIF_PROVIDER_SCOPE=APPEARS_ACTIVE_AND_MAIN_RESTRICTED"
    echo "WIF_PROVIDER_RESOURCE=$WIF_RESOURCE"
  else
    echo "WIF_PROVIDER_SCOPE=NOT_VERIFIED"
  fi
else
  echo "WIF_PROVIDER_SCOPE=NOT_FOUND_OR_ACCESS_DENIED_FOR_THIS_POOL"
fi

if gcloud iam service-accounts describe "$SERVICE_ACCOUNT" --project="$PROJECT" --format='value(email)' >"$TMP/sa" 2>"$TMP/sa-error"; then
  echo "SERVICE_ACCOUNT=EXISTS_NOT_PERMISSION_CERTIFIED"
  echo "SERVICE_ACCOUNT_EMAIL=$SERVICE_ACCOUNT"
else
  echo "SERVICE_ACCOUNT=NOT_FOUND_OR_ACCESS_DENIED"
fi

echo "GH_ACTIONS_CONFIGURATION=SEPARATE_OPERATOR_CHECK_REQUIRED"
echo "WIREGUARD_HANDSHAKE=NOT_VERIFIED"
echo "TWO_PEER_ACCEPTANCE=NOT_VERIFIED"
echo "NODE_LIVE=NOT_CERTIFIED"
echo "NO_CLOUD_MUTATION=TRUE"
