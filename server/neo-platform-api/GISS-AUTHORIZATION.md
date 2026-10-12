# GISS academic connection

The existing NEOpass service authorizes the registered `gisd-office` client at the exact HTTPS callback `https://gisd-office.shemsizedek.chatgpt.site/api/neopass/callback`.

A logged-in NEOpass member explicitly consents to share identity and read-only academic records. An S256 PKCE code expires after two minutes and is consumed transactionally from Firestore. The exchange returns a fifteen-minute token signed with a dedicated key derived from the existing NEOpass signing secret. Other services cannot verify this token using the ordinary NEOpass key. The ordinary subject resolver also rejects its token use.

The only token-protected operation is GET `/auth/giss/records`. It calls the existing Temple GISS registry and preserves active credential, citizen, and Book of Life requirements. No enrollment, council advancement, role mutation, credential issuance, or Crown operation is authorized by this grant.

The Sites app retains its own platform identity and role checks. It binds the verified NEOpass email and subject to that signed-in account; it never derives school administration rights from a remote role. Short-lived service authorization sessions belong in backend-only storage, never localStorage or client code.

Firestore collection: `gissAuthorizationCodes`. Expired codes are rejected even if a TTL cleanup policy is not present. The existing Cloud Run workload identity owns Firestore access; no new signing secret or shared client secret is needed. GET `/auth/giss/status` reports the registered redirect and read scope without exposing credentials.

A real member test must verify the complete redirect, consent, callback, identity binding, and registry read. Passing fixture tests does not establish live member eligibility or deployment success.
