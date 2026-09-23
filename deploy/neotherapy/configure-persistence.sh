#!/usr/bin/env bash
set -euo pipefail
: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${NEOTHERAPY_SERVICE:?Set NEOTHERAPY_SERVICE}"
: "${NEOTHERAPY_BUCKET:?Set NEOTHERAPY_BUCKET}"
REGION="${GCP_REGION:-us-central1}"
MOUNT="/mnt/neotherapy"
gcloud run services update "$NEOTHERAPY_SERVICE" \
  --project "$GCP_PROJECT_ID" --region "$REGION" \
  --add-volume "name=neotherapy-data,type=cloud-storage,bucket=$NEOTHERAPY_BUCKET" \
  --add-volume-mount "volume=neotherapy-data,mount-path=$MOUNT" \
  --update-env-vars "NEOTHERAPY_DATA_PATH=$MOUNT/store.json"
echo "Configured $NEOTHERAPY_SERVICE with Neotherapy data mount at $MOUNT"
