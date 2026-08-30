#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_TF_STATE_BUCKET:?Set GCP_TF_STATE_BUCKET}"
: "${GCP_WIF_PROVIDER:?Set GCP_WIF_PROVIDER}"
: "${GCP_SERVICE_ACCOUNT:?Set GCP_SERVICE_ACCOUNT}"

required_apis=(
  compute.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  sts.googleapis.com
  storage.googleapis.com
)

for api in "${required_apis[@]}"; do
  if ! gcloud services list --enabled --project "$GCP_PROJECT_ID" --filter="config.name=${api}" --format='value(config.name)' | grep -Fxq "$api"; then
    echo "[FAIL] Required API not enabled: $api" >&2
    exit 1
  fi
  echo "[OK] API enabled: $api"
done

if ! gcloud storage buckets describe "gs://${GCP_TF_STATE_BUCKET}" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "[FAIL] Terraform state bucket is missing or inaccessible: gs://${GCP_TF_STATE_BUCKET}" >&2
  exit 1
fi

echo "[OK] Terraform state bucket is accessible: gs://${GCP_TF_STATE_BUCKET}"

if ! gcloud iam service-accounts describe "$GCP_SERVICE_ACCOUNT" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  echo "[FAIL] GitHub deployment service account is missing: $GCP_SERVICE_ACCOUNT" >&2
  exit 1
fi

echo "[OK] GitHub deployment service account exists: $GCP_SERVICE_ACCOUNT"

POOL_ID="$(awk -F/ '{print $(NF-2)}' <<<"$GCP_WIF_PROVIDER")"
PROVIDER_ID="$(awk -F/ '{print $NF}' <<<"$GCP_WIF_PROVIDER")"

if [[ -z "$POOL_ID" || -z "$PROVIDER_ID" ]]; then
  echo "[FAIL] GCP_WIF_PROVIDER is not a canonical provider resource name" >&2
  exit 1
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --project "$GCP_PROJECT_ID" --location global --workload-identity-pool "$POOL_ID" >/dev/null 2>&1; then
  echo "[FAIL] Workload Identity provider is missing or inaccessible" >&2
  exit 1
fi

echo "[OK] Workload Identity provider exists"
echo "NEO VPN Google Cloud activation preflight passed."
