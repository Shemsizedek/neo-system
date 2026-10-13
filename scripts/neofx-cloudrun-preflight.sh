#!/usr/bin/env bash
set -euo pipefail
REGION="${NEO_FX_REGION:-us-central1}"
SERVICE="${NEO_FX_SERVICE:-neo-edge}"
DOMAIN="neofx.holytemples.org"
echo "NEO FX 030 — Google Cloud release preflight"
command -v gcloud >/dev/null || { echo "BLOCK: gcloud missing"; exit 2; }
command -v curl >/dev/null || { echo "BLOCK: curl missing"; exit 2; }
PROJECT="$(gcloud config get-value project 2>/dev/null)"
[[ -n "$PROJECT" && "$PROJECT" != "(unset)" ]] || { echo "BLOCK: Google Cloud project unset"; exit 2; }
[[ "${NEO_FX_LIVE_TRADING:-false}" == "false" ]] || { echo "BLOCK: live execution must remain off"; exit 2; }
[[ "${NEO_FX_GUARDIAN_TRANSPORT_ENABLED:-false}" == "false" ]] || { echo "BLOCK: Guardian external sends not certified"; exit 2; }
echo "Project: $PROJECT; service: $SERVICE; region: $REGION"
gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)' > /tmp/neofx-service-url
[[ -s /tmp/neofx-service-url ]] || { echo "BLOCK: Cloud Run service URL missing"; exit 3; }
gcloud run domain-mappings describe --domain "$DOMAIN" --region "$REGION" --format=json > /tmp/neofx-domain.json || { echo "BLOCK: domain mapping missing"; exit 3; }
echo "Checking TLS and HTTP response at https://$DOMAIN"
curl --fail --silent --show-error --location --max-time 20 "https://$DOMAIN/" -o /tmp/neofx-response.html || { echo "BLOCK: failed HTTP/TLS check"; exit 4; }
[[ -s /tmp/neofx-response.html ]] || { echo "BLOCK: empty response"; exit 4; }
echo "PASS: service exists, mapping describes, hostname responds over HTTPS"
echo "Manual review still required: FX screen routing, identity controls, CI, data feeds, broker permissions, recovery and rollback."
