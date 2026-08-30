#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_TF_STATE_BUCKET:?Set GCP_TF_STATE_BUCKET to a globally unique bucket name}"
: "${GCP_REGION:=us-central1}"
: "${GCP_DEPLOYER_SERVICE_ACCOUNT:=neo-vpn-deployer@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"

gcloud services enable storage.googleapis.com --project "${GCP_PROJECT_ID}"

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

# HashiCorp's GCS backend requires Storage Object Admin on the backend bucket.
# Bucket Viewer is added only so preflight can read bucket metadata without a
# project-wide Storage Admin grant.
for role in roles/storage.objectAdmin roles/storage.bucketViewer; do
  gcloud storage buckets add-iam-policy-binding "gs://${GCP_TF_STATE_BUCKET}" \
    --member="serviceAccount:${GCP_DEPLOYER_SERVICE_ACCOUNT}" \
    --role="$role" >/dev/null
done

cat <<EOF
NEO VPN Terraform state bucket is ready.

Project:  ${GCP_PROJECT_ID}
Bucket:   ${GCP_TF_STATE_BUCKET}
Prefix:   neo-vpn/node-001
Deployer: ${GCP_DEPLOYER_SERVICE_ACCOUNT}

Bucket-scoped IAM:
- roles/storage.objectAdmin
- roles/storage.bucketViewer

Add this GitHub repository/environment variable:
GCP_TF_STATE_BUCKET=${GCP_TF_STATE_BUCKET}

The bucket is private, uses uniform bucket-level access, has public access prevention enabled, keeps object versions for state recovery, and does not require a project-wide Storage Admin grant.
EOF
