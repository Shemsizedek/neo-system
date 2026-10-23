# KI-018 — Two-party signed authorization for controlled KNOWINDEX contributions

## Gate result: security implementation staged; production writing NOT approved

Date: October 23, 2026. This change adds another independent barrier between the already deployed KNOWINDEX moderation code and any future controlled live write session. It DOES NOT provision a database, approve real identities, activate Google Cloud billing, dispatch protected Cloud Run workflows, or enable KNOWINDEX writes.

The source and public Noogle search remain live and read-only. A Boolean service flag alone no longer authorizes write activity.

### Live evidence and remaining blockers

- KI-017 merge 4e6df05b85053fb6e01d9ba20ac2af96ee09d34e deployed to Render. Public Noogle index has 12 records including the one reviewed World Library landing page. NEO Platform API returns HTTP 200 for /api/v1/platforms and HTTP 503 with writesEnabled false for the KNOWINDEX contribution endpoint.
- KI-017 GitHub Pages workflow run https://github.com/Shemsizedek/neo-system/actions/runs/39976617104 completed successfully.
- Earlier GISS Secret Manager reference metadata checks on October 15 passed; the most recent historic IAM audit https://github.com/Shemsizedek/neo-system/actions/runs/38724274449 failed due to Google Cloud billing being disabled. Binding presence does not prove secret access, current token issuance or curator membership.
- The newer protected Cloud Run audit workflow .github/workflows/ki016-gcp-neopass-metadata-audit.yml requires manual dispatch from the production environment and has not been executed for KI-018.
- Render still has no approved isolated KNOWINDEX production database: noogle-connect-dev is temporary development storage expiring November 15, 2026; neo-pads-production belongs to a separate business workstream. Neither was changed.

## New fail-closed controls

1. The contribution HTTP boundary requires all of the following at the same time:
   - An explicit KNOWINDEX write-request flag, authoritative verified NEOpass membership, and valid configured signing secret.
   - A short-lived, Ed25519 dual-signed KI-018 activation statement from TWO distinct trusted public keys: operator and independent security approver.
   - A precisely matched deployment commit, production environment/service, and SHA-256 fingerprint of the observed database name/address/port.
   - Six distinct archival evidence receipt digests for GISS IAM/issuer, real contributor identity, independent curator role, dedicated database ownership, off-host backup-and-restore, and emergency disablement rehearsal.
   - Current restricted PostgreSQL privileges, audit triggers and verified hash-chain integrity. Runtime catalog lookup must succeed and must not be an expiring dev/test or NEO Pads database.
   - A runtime PostgreSQL adapter instantiated with maxTotalSubmissions=1. Under the existing serialized advisory-lock transaction, no second new record can be accepted, including after withdrawal.
   - Only the one subject digest bound as the contributor (role member) and the independent digest bound as the curator (current authorized reviewer role). Token claims alone cannot elevate privileges.
2. The statement is valid for no more than four hours and must be reverified for each HTTP request. Expiration, a changed DB, audit tampering, missing trusted keys, invalid signature, role revocation, unsupported source or an offline database all deny writes.
3. Existing moderation state machine is unchanged: submitted, validated, attributed, approved, disputed or removed. Approved does not mean indexed; no public Noogle publication occurs through this HTTP API.
4. The activation trust anchors and approvals do NOT exist in the repository. Tests generate temporary Ed25519 signing keys and fake subjects only. No production signer or real user account was authorized or committed.
5. There is no production GISS bootstrap path for the activation statement in this gate. Existing startup passes no proof and no KNOWINDEX database; the API must remain disabled until a separately reviewed, explicit operational integration.

## Boundaries and limitations

- A cryptographic signature proves who signed a statement under the configured trust anchors. It DOES NOT independently establish that the underlying backup, IAM, issuer, subject consent or role assignment evidence is genuine. Those must be verified against their originating systems by separate accountable approvers. Distinct receipt digests are a structural condition, not proof of independent audit.
- A database-name/address/port fingerprint binds to observed connection properties, not legal ownership or a cloud instance's stable identity. Operators must also verify the actual service/account and backup ownership before signing. The live Postgres inspector reports off-host recovery and real identity as unverified.
- Operators must keep approver private keys and any signed production envelope outside source control, Actions logs and public artifacts. Only allowlisted public verification keys belong in an approved runtime secret configuration. Signatures and subject hashes are not a replacement for authentication, RBAC, or independent consent.
- Tests that simulate a certified database are TEST-ONLY fixtures. The live service must use a dedicated Postgres runtime principal and the production DB read-only security inspection.

## Activation and rollback checklist — all must be true before live pilot

1. Verify the protected Google Cloud IAM/secret metadata through approved production environment access. If GCP billing must be changed, request separate approval; do not perform it opportunistically.
2. With consent, validate real active contributor and separate curator in the authoritative NEOpass registry and verify actual issuer, revocation and browser/session audience.
3. Obtain approval for an isolated persistent PostgreSQL database, strictly scoped role and backup owner; do not share NEO Pads or development DB. Apply migration through a separate privileged identity.
4. Prove off-host backup and restoration of the actual production instance, audit-head continuity, RPO/RTO and observable emergency stop. Compute the database fingerprint on a trusted host.
5. Review SIX original evidence records before two independent approvers sign a four-hour envelope with a one-record quota. Do not record signers' or users' raw IDs in GitHub issues, code or action output.
6. Activate only the approved pilot runtime with trustworthy deployment SHA, persistent Postgres adapter and restricted NEOpass authority. Attempt one valid submission, idempotent replay, independent validation/attribution/approval and withdrawal. Reject second record, bad signature, wrong subject, stale JWT and role revocation.
7. Immediately disable writes after the pilot, confirm anonymous contribution GET returns 503, untrusted Origin remains 403, and public Noogle search still returns HTTP 200 with no unreviewed records. Retain the audit chain and redacted proof.

## Evidence

- Dedicated KI-018 unit / HTTP / production fail-closed workflow: .github/workflows/ki018-knowindex-dual-activation.yml
- PostgreSQL integration and isolated restore: .github/workflows/knowindex-postgres-cert.yml
- Related operational register: https://github.com/Shemsizedek/neo-system/issues/1177

**Never perform wallet operations, token issuance, KNOWINDEX/NOMNI transfers, or NEO Crown Chain signing as part of this gate.**
