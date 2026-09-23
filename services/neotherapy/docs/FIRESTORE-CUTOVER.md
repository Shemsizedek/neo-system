# Firestore API cutover

The production-candidate Neotherapy storage endpoint now uses `FirestoreNeotherapyStore` instead of the file adapter. Existing authorization guards remain mandatory: ACTIVE consent, ACTIVE practitioner credential, modality authorization, and completed safety screening.

Runtime authentication uses the existing Cloud Run metadata-token path. The project is resolved from `GOOGLE_CLOUD_PROJECT`, `GCP_PROJECT_ID`, or `GCLOUD_PROJECT`. The database is selected by `NEOTHERAPY_FIRESTORE_DATABASE`, then `FIRESTORE_DATABASE_ID`, then `(default)`.

Deployment verification must prove a canary write/read against the authorized Firestore database before the production UI is switched to live participant records.
