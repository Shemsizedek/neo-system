# Project 144 — Nous OS identity consent and recovery gate

Status: **staging code reviewed by CI; NEOpass production consent disabled**.
Reference: [PR #1388](https://github.com/Shemsizedek/neo-system/pull/1388).

## Opt-in NEOpass access contract

The GISS/NEOpass application must be independently deployed and configured before any real user can enroll. By default `NOUS_CONSENT_ENABLED` and `NOUS_TOKEN_EXCHANGE_ENABLED` must remain **unset or false**.

The explicit self-service consent handler is `server/neo-platform-api/nous-consent.mjs`. It requires a fresh, bearer-authenticated `token_use=session` / `aud=neopass-session` login and verifies the subject using the authoritative Firestore credential registry. Cookie-only and stale-session changes are rejected. No administrator account is automatically granted Nous access.

| Route | Method | Action |
| --- | --- | --- |
| `/api/v1/auth/nous-consent/status` | GET | Return the current user's opt-in status; no secrets |
| `/api/v1/auth/nous-consent/grant` | POST | Requires body `{"acknowledge":"ENABLE_NOUS_READ_ONLY_FOR_24_HOURS"}`; grants up to 24 hours, read-only |
| `/api/v1/auth/nous-consent/revoke` | POST | No body; disables grant and invalidates older sessions at the Nous exchange boundary |

Consent changes use Firestore's transaction API against the existing credential record. Grants cannot change membership status or roles. The `nous-membership-guard.mjs` exchange guard checks active, unsuspended membership, explicit `nousAccessEnabled`, optional grant expiry and `sessionRevokedAfter` at each exchange.

Newly issued NEOpass login sessions now carry explicit `token_use=session`, `aud=neopass-session`. Older login tokens must not be silently elevated: users must sign in again after rollout to obtain a consent-capable session. The Nous exchange rejects legacy or browser-purpose bearer credentials and issues no planning or write scopes.

This rollout must be preceded by a user-facing disclosure describing **what read-only Nous access means**, what account data is used, expiry, and how to withdraw consent. No such disclosure UI has been deployed in this gate.

## Identity key rotation (not yet exercised against live NEOpass)

- Keep all Ed25519 private signing keys only at the trusted GISS issuer under managed secrets.
- Configure the Nous verifier with a protected base64-encoded JSON `NOUS_IDENTITY_KEYRING_JSON_BASE64`, with each entry containing `kid` and `publicKeyPem`.
- Configure the issuer's matching `NOUS_EXCHANGE_KEY_ID`. Introduce the new public key first, then switch issuer signing, then remove/deny-list old keys after the maximum token lifetime.
- For emergency revocation set `NOUS_IDENTITY_REVOKED_KEY_IDS` and re-deploy the verification environment. Reject unauthenticated requests after rotation.
- A revoked NEOpass session cannot obtain a *new* Nous token; already-issued read-only Nous tokens can remain valid for up to 120 seconds until expiry or signing-key denial.

## Isolated Neon recovery evidence — November 10, 2026

Source project: `still-mud-99152400`; source branch `br-odd-sun-bcm8pvfs` (`main`).
Recovery branch: `br-polished-water-bc7bisfv` (`p144-nous-recovery-20261110`).

An isolated child branch was provisioned from the staging database. A read-only query on that child returned exactly one copy of the signed GitHub OIDC planning receipt:

- Request `CI-P144-PR1388-STAGING-01`
- Receipt ID `1a83f78d-7b06-4cb4-b30c-3a58eb4db892`
- `execution=disabled`

This verifies **branch snapshot accessibility and copied receipt integrity**, not restoration into a replacement live endpoint, a full backup export, a point-in-time rewind, or the provider's recovery-point/recovery-time objectives. Do not delete the recovery branch or overwrite the source without specific authorization. Confirm current Neon free-tier limits before creating additional snapshots.

## Next authorized gate

1. Validate proposed disclosure/consent copy in the NEOpass UI and approve identity key provisioning in a **separate staging issuer**, not production.
2. Test real user sign-in, opt-in, read-only access, 24-hour expiry, revocation and session reauthentication, including old-token denial.
3. Verify network-level ingress policy, account monitoring, key-rotation emergency rollback and recovery into a replacement staging database.
4. Review PR, confirm all CI checks, and obtain promotion approval before merge or production activation.

No autonomous agent execution, payments, wallet signing, transfers, production membership modification, or production configuration changes are authorized by this gate.

## Member-facing consent interface — November 11, 2026

A responsive same-origin NEOpass consent UI has been committed at `/neopass/nous-access`, with static assets under `/neopass/nous-access.css` and `/neopass/nous-access.js`. The screen discloses access boundaries, 24-hour grant duration, token lifetime, withdrawal behavior, and the distinction between consent records and Nous planning receipts.

**Default-off**: GISS serves the screen, its static assets, the `GET /api/v1/auth/nous-consent/intent` endpoint and the grant/status/revoke API only when `NOUS_CONSENT_ENABLED=true`. This is not configured on a running NEOpass service by this gate.

The UI obtains a 120-second `nous-consent-intent` token via a same-origin GET request authenticated by an HttpOnly cookie from a recent NEOpass login. It does not read the cookie into JavaScript. The temporary token stays in memory, and is destroyed when the page is left. A cookie-only consent mutation remains forbidden. The intent credential is limited to `aud=neopass-consent`, `scope=nous:consent:self`, and includes the original `auth_time`. The consent API checks the original authentication time and the current credential-revocation cutoff. This is not a Nous access token or an agent-execution grant.

Production readiness requires an authorized user-facing enrollment/reauthentication path on the NEOpass domain, secure cookie and cross-origin validation at the actual ingress, monitored error handling, and an independent live test of opt-in and revocation. The ordinary `NeoPass.getAccessToken` browser token is not a consent-capable credential and must not be reused for this grant.
