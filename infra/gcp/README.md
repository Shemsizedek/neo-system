# NEO System — Google Cloud Foundation

This directory defines the Google Cloud deployment foundation for the `neo-system` monorepo.

## Deployment model

- GitHub remains the source of truth.
- Each deployable NEO service is built independently.
- Cloud Build builds service containers.
- Artifact Registry stores versioned container images.
- Cloud Run hosts stateless HTTP/API services.
- Secret Manager stores runtime secrets.
- IAM uses least-privilege service accounts.
- Existing GitHub Pages and GitHub Actions workflows remain independent unless explicitly migrated.

## Required Google Cloud APIs

- `run.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`
- `secretmanager.googleapis.com`
- `iam.googleapis.com`
- `iamcredentials.googleapis.com`
- `sts.googleapis.com`

## Bootstrap

Run `bootstrap.sh` from an authenticated Google Cloud Shell or workstation with the Google Cloud CLI installed.

Required environment variable:

```bash
export GCP_PROJECT_ID="your-project-id"
```

Optional variables:

```bash
export GCP_REGION="us-central1"
export GCP_ARTIFACT_REPOSITORY="neo-services"
```

Then:

```bash
bash infra/gcp/bootstrap.sh
```

The bootstrap is intentionally conservative. It enables APIs and creates shared infrastructure, but does not deploy an application or write secret values.

## Service deployment

`cloudbuild.service.yaml` is a parameterized build definition. A Cloud Build trigger should supply:

- `_SERVICE_NAME` — Cloud Run service name
- `_SERVICE_DIR` — source directory containing that service's Dockerfile
- `_REGION` — deployment region
- `_ARTIFACT_REPOSITORY` — Artifact Registry repository

Example service mapping:

```text
neo-prime   -> apps/neo-prime
neopay      -> apps/neopay
neo-exchange -> apps/neo-exchange
neoscan     -> apps/neoscan
```

Before enabling automatic deployment for a service, verify that its directory has a production-ready Dockerfile and that the process listens on the Cloud Run `PORT` environment variable.
