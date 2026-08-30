#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_TF_STATE_BUCKET:?Set GCP_TF_STATE_BUCKET to a globally unique bucket name}"
: "${GCP_REGION:=us-central1}"

if ! gcloud storage buckets describe "gs://${GCP_TF_STATE_BUCKET}" --project "${GCP_PROJECT_ID}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${GCP_TF_STATE_BUCKET}" \
    --project "${GCP_PROJECT_ID}" \
    --location "${GCP_REGION}" \
    --uniform-bucket-level-access \
    --public-access-prevention
fi

gcloud storage buckets update "gs://${GCP_TF_STATE_BUCKET}" \
  --versioning \
  --uniform-bucket-level-access \
  --public-access-prevention

cat <<EOF
NEO VPN Terraform state bucket is ready.

Project: ${GCP_PROJECT_ID}
Bucket:  ${GCP_TF_STATE_BUCKET}
Prefix:  neo-vpn/node-001

Add this GitHub repository/environment variable:
GCP_TF_STATE_BUCKET=${GCP_TF_STATE_BUCKET}

The bucket is private, uses uniform bucket-level access, has public access prevention enabled, and keeps object versions for state recovery.
EOF
