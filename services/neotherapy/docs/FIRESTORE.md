# NEOTHERAPY-FIRESTORE-001

Neotherapy uses the repository's existing Firestore REST adapter and Cloud Run metadata-token authentication. No new database SDK or static credential is introduced.

Collections are namespace-isolated:
- `neotherapy_consents`
- `neotherapy_credentials`
- `neotherapy_sessions`
- `neotherapy_audit`

Database selection: `NEOTHERAPY_FIRESTORE_DATABASE`, falling back to the repository's `FIRESTORE_DATABASE_ID` and then `(default)`.

This removes the JSON file store's single-instance limitation for the Firestore path. Participant records remain purpose-limited and must not be copied into general NEO intelligence collections without explicit authorization.
