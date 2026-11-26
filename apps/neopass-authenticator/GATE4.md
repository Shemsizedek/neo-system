# Project 144 — NEOpass Authenticator Gate 4 (2026-11-21)

**DRAFT / UNMERGED / NOT DEPLOYED / NO REAL ENROLLMENT.** Parent PR #1447, dependent NEO Key cryptographic backend draft PR #1435. No GitHub Actions configuration, cloud, production account, wallet, or database was changed.

## Source audit: USB Raptor and Ayberk-Irmak/USB-Key

- USB Raptor is a Windows USB-drive-presence desktop lock application. It is NOT an external FIDO2/WebAuthn authenticator.
- The third-party [USB-Key](https://github.com/Ayberk-Irmak/USB-Key) is a Windows Python desktop lock. Its `config.py` writes a fixed `my_secret_key` marker with a SHA-256 hash of a six-digit PIN; `usbkey.py` compares that hash when a USB file is present. This is not strong enough to trust for NEO login, physical-key attestation or account recovery.
- **Neither utility is integrated into NEOpass.** Do not vendor, install or run their code on library/shared computers. If desired, separately design a workstation-only USB-presence convenience feature after security review. Never allow it to grant NEO login or substitute for physical FIDO2 hardware.
- **OpenAI Daybreak is separately authorized by OpenAI.** NEO-developed software cannot satisfy OpenAI's requirement for a qualifying, attested, physical, non-exportable FIDO2 hardware security key, nor confer Daybreak approval. Visit https://chatgpt.com/cyber and follow the account/workspace-specific eligibility and Advanced Account Security flow on a personal device.

## Gate 4 implementation (this PR)
- `postgres-ceremony-store.mjs`: server-only, injected PostgreSQL client; HMAC-SHA256 binding to trusted account + opaque session + operation + exact RP/origin, with no raw subject or session key stored in the database binding.
- Test-only `sql/004_neopass_staging_ceremonies.sql` defines the one-use challenge table, five-minute TTL constraint and expiry index. **Unapplied.**
- `put` atomically prevents replacing an unconsumed unexpired challenge. `take` uses one parameterized `UPDATE ... RETURNING` statement, so only one concurrent worker can consume a challenge.
- `staging-postgres-app.mjs`: inactive-by-default composition of the existing Gate 3 HTTP adapter and new ceremony store, requiring an independently trusted NEO Key staging service, session resolver, CSRF, rate limits, credential lookup and dual-control enrollment authorization.
- Unit/mocked-PostgreSQL tests cover session/account/purpose separation, duplicate issuance, replay, expiry, concurrency, database failure, HTTP registration and authentication response contracts. Mock verifier responses **are not** WebAuthn cryptographic evidence.
- Opt-in `postgres-ceremony-store.pg.test.mjs`: real PostgreSQL 16+ concurrent take, expiration and rollback contract. It **skips** unless `NEOPASS_DISPOSABLE_PG_URL` points to an explicitly local disposable database whose name contains test, ci or disposable and the `pg` dependency is installed. This is test-only and will truncate/drop its test table. Never use a persistent NEO database.

## Verification and limitations
Local non-network tests on an isolated Node 22 environment proved the same atomic put/take algorithm and HTTP-to-store mock integration. This PR's newly committed source needs a full fresh GitHub Actions run and real PostgreSQL execution before approval. No proof of a complete NEO Key cryptographic registration/assertion or production sessions is claimed.
- Source PR #1435 is **not merged into main**; our branch cannot import its unpublished crypto modules as a production dependency. Integration requires reviewed branch coordination.
- No disposable PostgreSQL runtime is available in the current isolated execution container; the real PostgreSQL suite is not certified by local execution.
- No authorized physical FIDO2 device or backup was accessible for attested hardware verification.
- No actual external independent security review, dual-control custody, live NEOpass issuer, database backup/restore or app release.

## Next milestone / release requirements
1. In an already-authorized disposable CI runner, provision PostgreSQL 16, install locked `pg`, and run opt-in real database tests including concurrent workers and transaction failure injection. Do not change paid plan/preview capacity.
2. Align this HTTP adapter with NEO Key #1435's verified registration, assertion and recovery callbacks and exact credential JSON. Run a synthetic cryptographic e2e with transient PostgreSQL, not just mocks.
3. Verify a real, qualifying FIDO2 primary and backup on an authorized personal machine, exact RP origin and attestation. Do not use the public library computer.
4. Independent security review and operational issuer + identity proofing + signer custody; then approval for isolated network staging. Do not activate before these pass.

**Release decision: NO-GO.** Draft PR only. Zero spending, no production, no merge.
