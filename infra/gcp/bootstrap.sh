#!/usr/bin/env bash
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID before running this script}"

GCP_REGION="${GCP_REGION:-us-central1}"
GCP_ARTIFACT_REPOSITORY="${GCP_ARTIFACT_REPOSITORY:-neo-services}"

printf 'Configuring Google Cloud project %s in %s\n' "$GCP_PROJECT_ID" "$GCP_REGION"

gcloud config set project "$GCP_PROJECT_ID"

# Core APIs required for Cloud Build -> Artifact Registry -> Cloud Run.
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com

if ! gcloud artifacts repositories describe "$GCP_ARTIFACT_REPOSITORY" \
  --location="$GCP_REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$GCP_ARTIFACT_REPOSITORY" \
    --repository-format=docker \
    --location="$GCP_REGION" \
    --description="NEO System deployable service images"
fi

PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
RUNTIME_SA_NAME="neo-cloud-run-runtime"
RUNTIME_SA="${RUNTIME_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$RUNTIME_SA" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
    --display-name="NEO Cloud Run Runtime"
fi

# Build-time permissions. These are project-scoped because Cloud Build must
# push images and create/update Cloud Run services.
for ROLE in \
  roles/artifactregistry.writer \
  roles/run.admin \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:${CLOUD_BUILD_SA}" \
    --role="$ROLE" \
    --condition=None >/dev/null
 done

# Runtime receives secret access only. Additional roles should be granted
# service-by-service, not globally.
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None >/dev/null

cat <<EOF

NEO Google Cloud foundation initialized.
Project:             ${GCP_PROJECT_ID}
Region:              ${GCP_REGION}
Artifact repository: ${GCP_ARTIFACT_REPOSITORY}
Runtime account:     ${RUNTIME_SA}

No application was deployed and no secret values were created.
Next: create a Cloud Build trigger for a verified service using infra/gcp/cloudbuild.service.yaml.
EOF
