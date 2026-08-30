#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GITHUB_REPOSITORY:=Shemsizedek/neo-system}"

POOL_ID="${POOL_ID:-github}"
PROVIDER_ID="${PROVIDER_ID:-neo-system}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-neo-vpn-deployer}"

PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT_ID}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

# Required APIs.
gcloud services enable \
  compute.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  --project "$GCP_PROJECT_ID"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID" \
    --project "$GCP_PROJECT_ID" \
    --display-name="NEO VPN GitHub Deployer"
fi

# Minimum practical project roles for this Terraform module. Tighten further with a custom role later.
for role in roles/compute.admin roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="$role" \
    --condition=None >/dev/null
done

if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project "$GCP_PROJECT_ID" --location global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project "$GCP_PROJECT_ID" \
    --location global \
    --display-name="GitHub Actions"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project "$GCP_PROJECT_ID" --location global \
  --workload-identity-pool "$POOL_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project "$GCP_PROJECT_ID" \
    --location global \
    --workload-identity-pool "$POOL_ID" \
    --display-name="neo-system GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPOSITORY}'"
fi

POOL_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}"
PROVIDER_NAME="${POOL_NAME}/providers/${PROVIDER_ID}"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --project "$GCP_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${GITHUB_REPOSITORY}" >/dev/null

cat <<EOF
Google Cloud Workload Identity is configured.

Set these GitHub repository/environment variables:
GCP_PROJECT_ID=${GCP_PROJECT_ID}
GCP_WIF_PROVIDER=${PROVIDER_NAME}
GCP_SERVICE_ACCOUNT=${SERVICE_ACCOUNT}
GCP_REGION=us-central1
GCP_ZONE=us-central1-a
GCP_NETWORK_NAME=default

No service-account JSON key is required or created.
EOF
