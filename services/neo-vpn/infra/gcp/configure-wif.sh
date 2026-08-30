#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GITHUB_REPOSITORY:=Shemsizedek/neo-system}"

POOL_ID="${POOL_ID:-github}"
PROVIDER_ID="${PROVIDER_ID:-neo-system}"
SERVICE_ACCOUNT_ID="${SERVICE_ACCOUNT_ID:-neo-vpn-deployer}"
RUNTIME_SERVICE_ACCOUNT_ID="${RUNTIME_SERVICE_ACCOUNT_ID:-neo-vpn-node-001}"
TRUSTED_REF="${TRUSTED_REF:-refs/heads/main}"

PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT_ID}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
RUNTIME_SERVICE_ACCOUNT="${RUNTIME_SERVICE_ACCOUNT_ID}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
ATTRIBUTE_CONDITION="assertion.repository=='${GITHUB_REPOSITORY}' && assertion.ref=='${TRUSTED_REF}'"

# Required APIs for Terraform, Workload Identity Federation, IAM, and remote state.
gcloud services enable \
  compute.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  storage.googleapis.com \
  --project "$GCP_PROJECT_ID"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID" \
    --project "$GCP_PROJECT_ID" \
    --display-name="NEO VPN GitHub Deployer"
fi

if ! gcloud iam service-accounts describe "$RUNTIME_SERVICE_ACCOUNT" --project "$GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SERVICE_ACCOUNT_ID" \
    --project "$GCP_PROJECT_ID" \
    --display-name="NEO VPN Node 001" \
    --description="Dedicated runtime identity for NEO VPN Node 001"
fi

# Terraform needs Compute administration in the project. The service-account
# impersonation grant is intentionally scoped to the Node 001 runtime identity only.
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/compute.admin" \
  --condition=None >/dev/null

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SERVICE_ACCOUNT" \
  --project "$GCP_PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser" >/dev/null

# Remove the older broad project-level actAs grant if it exists. Ignore absence.
gcloud projects remove-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser" \
  --condition=None >/dev/null 2>&1 || true

if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project "$GCP_PROJECT_ID" --location global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project "$GCP_PROJECT_ID" \
    --location global \
    --display-name="GitHub Actions"
fi

if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project "$GCP_PROJECT_ID" --location global \
  --workload-identity-pool "$POOL_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER_ID" \
    --project "$GCP_PROJECT_ID" \
    --location global \
    --workload-identity-pool "$POOL_ID" \
    --attribute-condition="$ATTRIBUTE_CONDITION"
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project "$GCP_PROJECT_ID" \
    --location global \
    --workload-identity-pool "$POOL_ID" \
    --display-name="neo-system GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="$ATTRIBUTE_CONDITION"
fi

POOL_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}"
PROVIDER_NAME="${POOL_NAME}/providers/${PROVIDER_ID}"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --project "$GCP_PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${GITHUB_REPOSITORY}" >/dev/null

cat <<EOF
Google Cloud Workload Identity is configured.

Trusted repository: ${GITHUB_REPOSITORY}
Trusted ref: ${TRUSTED_REF}
Deployment identity: ${SERVICE_ACCOUNT}
Node 001 runtime identity: ${RUNTIME_SERVICE_ACCOUNT}

Set these GitHub repository/environment variables:
GCP_PROJECT_ID=${GCP_PROJECT_ID}
GCP_WIF_PROVIDER=${PROVIDER_NAME}
GCP_SERVICE_ACCOUNT=${SERVICE_ACCOUNT}
GCP_REGION=us-central1
GCP_ZONE=us-central1-a
GCP_NEO_VPN_SUBNET=10.145.1.0/24
GCP_TF_STATE_BUCKET=<your-private-terraform-state-bucket>

No service-account JSON key is required or created.
EOF
