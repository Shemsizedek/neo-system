# NEOTHERAPY-PERSISTENCE-001 — GCP target

Target: Google Cloud Run in `us-central1`, using a dedicated Cloud Storage volume mounted at `/mnt/neotherapy`.

Required deployment inputs:
- `GCP_PROJECT_ID`
- `NEOTHERAPY_SERVICE`
- `NEOTHERAPY_BUCKET`
- optional `GCP_REGION` (defaults to `us-central1`)

The deployment script does **not** create or guess a project, service, or bucket. Those values must identify existing/authorized GCP resources.

The mounted data path is configured as:
`NEOTHERAPY_DATA_PATH=/mnt/neotherapy/store.json`

## Production boundary
This retains the current single-instance storage limitation. Do not scale the writer above one instance while using the JSON file store. Cloud Storage volume durability does not make a shared JSON file a transactional multi-instance database.

## Cutover verification
1. Configure the Cloud Run volume.
2. Deploy the storage-backed API.
3. Confirm its status response.
4. Write a non-sensitive canary record.
5. restart/redeploy the service.
6. confirm the canary persists.
7. only then route live Neotherapy UI writes to the storage-backed endpoint.
