# Project 144 - CES repeatable login and account attestation

## Login continuity
The CES read runtime uses protected server-side configuration and creates a new authenticated CES session when requested. An open desktop browser is not required for later server operations. Browser cookies are not a durable service credential.

Store the CES NMNI account username and password only as protected runtime environment values named `NEO_CES_NMNI_USERNAME` and `NEO_CES_NMNI_PASSWORD`. The account also requires any CES-issued MFA or challenge, if present, during login. Provision the existing `NEO_CES_BACKEND_TOKEN` and `NEO_CES_RUNTIME_TOKEN` through the Render secret configuration; tokens must be separate and restricted by operation. Confirm configuration with authorized `/v1/status`, not a public endpoint. Do not print values, submit credentials in chat, copy browser cookies, or commit secrets.

Source access is read-only unless a separate approved, tested import policy is activated. Rotate credentials on account changes or incidents. Authenticate again when cookies expire rather than persist server-side cookies indefinitely.

## Attestation policy
`server/neo-bots/ces-account-attestor.mjs` is the CES-side Ed25519 signer. Its private key should be a dedicated `NEO_CES_ATTESTOR_PRIVATE_KEY_PEM` runtime secret; its public key is pinned in NEO Bank. Neither is currently provisioned by this source change.

The separate `accountControlVerifier` must independently check an authorized CES protected account record for the precise exchange account AND authorized delegation to the NEO identity. Successful generic admin login does not establish account control. As of this gate, no reviewed CES source account record and principal delegation verifier has been established; signing is therefore disabled.

The protected `POST /v1/account/attest` endpoint accepts a short-lived NEO Bank challenge, only with dedicated backend authorization and only after the account-control verifier is configured. It rejects browser origins, operator-only authorization, unverified accounts, and malformed requests. Do not share the CES attestor private key with the bank application. NEO Bank pins the public key and independently consumes each nonce using its persistent challenge store.

## Evidence and launch sequence
1. Obtain reviewed CES account-control records for `NMNIBANK`, then `XCPCBANK`; verify each NEO principal delegation through a trusted upstream mechanism.
2. Configure a least-privilege server-side account-control verifier and audit its exact source, selectors, and proof conditions.
3. Generate a dedicated Ed25519 keypair in a protected environment and provision the signing secret only to CES runtime. Pin the corresponding public key in the bank backend using secure configuration.
4. Validate bank challenges, actual source-specific proof, signature and replay rejection. Keep issuance, settlement and all financial writes disabled.
5. Review Neon schema migrations and apply only after approval and staging backup. Confirm each account link is identifier-only.
6. Verify browserless repeat login, backend status, and recovery after restart without exposing credentials or session state.

**No production DNS, CES account, balance, payment or bank database changes are authorized by this document.**

## Upstream access diagnosis - 2026-11-01
- The one-shot, authorized Render staging NMNI login preflight reached the CES legacy login page but received HTTP 403 from upstream before submitting credentials. No password was posted and no account verification was completed. The temporary `NEO_CES_AUTH_PREFLIGHT_ON_START` flag was disabled again.
- An independent no-credential check from the connected Linux workstation also returned HTTP 403 for the CES legacy and public www login pages. The response identified Cloudflare as the edge server. This establishes edge access denial, not incorrect CES credentials or compromised accounts.
- The login adapter now classifies 401/403/429 from the login page as `upstream_access_denied` and redirects/non-2xx as `login_page_unavailable`, without sending credentials. Only allowlisted stage and reason values appear in preflight logs.
- CES's *officially documented* mobile address `https://ces.community/index.php` returned HTTP 200 in a no-credential Linux read. Its public form advertised same-origin `POST /rlogin.php` fields `uid` and `passwd`. This is evidence of an available supported login surface, **not** a successful session or a reviewed administrator access path. No automated password submission was attempted to that site.
- CES publicly describes its external integration API specification as planned work in the July 2026 upgrade, not a currently issued API credential or granted integration permission.
- Official references: https://www.community-exchange.org/home/user-login/ and https://www.community-exchange.org/home/ces-upgrade/ .
- CES's public general contact: `info@community-exchange.org`. Request a documented account-specific read API or approved service-access method/allowlisting; do not ask CES to send credentials by email.

### Safe next action
1. Confirm that the supported CES mobile session can prove the signed-in principal, ideally using a documented read-only API or reviewed protected-page contract. Do not assume a 200 login form authenticates an administrator.
2. Obtain explicit CES service integration/access terms or an approved origin when infrastructure blocks non-browser access; do not try rotating proxies or copying browser cookies to evade Cloudflare challenges.
3. After a successful administrator session, inspect exact `NMNIBANK` record and separate delegation evidence. Only then enable the account-specific signer.
4. Keep the read-only runtime operational and keep its preflight flag disabled when not performing a scheduled diagnostic. No transfers, account provisioning or domain switch.
