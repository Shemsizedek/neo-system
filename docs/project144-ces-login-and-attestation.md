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

## Mobile login verification - 2026-11-01
- CES official mobile form at `https://ces.community/index.php` is reachable, with exact action `POST /rlogin.php`, fields `uid`, `passwd`, hidden `by=usr`, and `timezone`. The official CES site recommends `ces.community` as a mobile login option.
- A staging-only bot module, `server/neo-bots/ces-mobile-login-preflight.mjs`, uses the existing `NEO_CES_NMNI_USERNAME` and `NEO_CES_NMNI_PASSWORD` runtime values, requires username `NMNI0000`, validates the form before submitting once, and verifies a protected logged-in account marker and logout control before reporting success. The module stores no cookies outside transient process memory and returns no credentials, HTML or account details to log output.
- GitHub NEO Bots Tests passed for the mobile implementation and the subsequent sanitized signal update. Render's build passed **123 tests**.
- The first controlled mobile attempt returned `member_session_unverified`.
- A second controlled check, with only categorical signals, returned `member_session_unverified`, `loginFormReturned:true`, `accountMarkerFound:false`, `signOutFound:false`, `responseKind:same_origin_redirect`. No account session was established to the bot's defined evidence standard. Neither the current credential validity nor CES account-level delegation can be inferred. The mobile site may not support this administrator identity or the login flow may require a different reviewed contract; avoid claiming either as fact.
- `NEO_CES_MOBILE_PREFLIGHT_ON_START` was set back to `false` immediately after the attempt. Do not repeat login retries automatically or enable persistent session reuse from this result.
- Banking writes, CES account associations, account attestation signing and production DNS remain disabled/unchanged.

### Next controlled action
Use the CES interactive mobile login and official CES assistance to confirm whether `NMNI0000` is supported by the mobile site. Do not email credentials or copy browser cookies into NEO. When a successful legitimate member session is independently corroborated, review the actual protected-page evidence and only then implement the least-privilege read adapter. Verify `NMNIBANK` ownership separately. 

## NMNI0000 member authentication recovered - 2026-11-01 (UTC: 2026-11-02)

**Successful actual staging evidence:** Render CES runtime log event `ces_nmni_mobile_preflight` returned `result:member_session_verified`, `memberAuthenticated:true`, `adminAuthenticated:false` at 2026-11-02T01:21:30Z. This follows a real mobile CES login using the existing protected Render credential configuration. No credential, session cookie, HTML or account records were logged.

**Root cause repaired:** The official `https://ces.community/index.php` sign-in form has `<button name="action" value="login" type="submit">`. The original NEO bot did not include `action=login` in its `POST /rlogin.php` form, causing CES to redirect back to login. Source `server/neo-bots/ces-mobile-login-preflight.mjs` now validates the submit button and includes `action=login`. Regression tests reject a changed/missing form before sending a password. NEO Bots dedicated CI succeeded for commit `f5daae39ded776ce29064e0116c64329fc435099`.

**Evidence boundary:** This is evidence of an authenticated NMNI0000 **member** session under the protected browserless server login, not evidence of Community Administrator privileges, account ownership of `NMNIBANK`, nor authority to move balances. The runtime still does not expose a trusted admin account-control route. `NEO_CES_MOBILE_PREFLIGHT_ON_START` was reverted to `false` after the single successful login check; it must remain off except for an explicitly scoped test.

**Next gate:** Implement a scoped read-only, backend-only verification of CES administrative status from an authenticated mobile session using a reviewed protected account/admin page (not merely a redirect). If the mobile site does not expose administrator controls, request the approved CES admin integration route. Inspect `NMNIBANK` evidence separately. Only after these controls are independently verified may the CES account attestor and NEO Bank account link be configured. Keep token issuance, financial writes, Neon migrations and production DNS unchanged.

## Mobile administration gate - November 1, 2026 local / November 2 UTC

**Authoritative CES product evidence:** CES's January 2026 CEN newsletter says administrative features, including transaction reports and newsletter management, are available on its CES1 mobile site: https://www.community-exchange.org/home/cen-newsletter-january-2026/ . The December 2025 newsletter describes an Administration page with a Transaction report option: https://www.community-exchange.org/home/cen-newsletter-december-2025/ . Therefore mobile administration is a supported product feature, but its authorization and navigation must be verified for this session.

**Implemented on CES staging branch:** `probeCesMobileMemberLogin(...,inspectAdministration:true)` adds a bounded read-only, same-origin discovery of an Administration link after verified `NMNI0000` member login. Only safe, query-free GET PHP links from authenticated page HTML can be followed; no guessed or cross-origin admin routes are fetched. The protected page must show the exact principal and specialized administration markers before the bot asserts `adminAuthenticated:true`. No session cookies, source page HTML, or account records are logged or persisted. The optional one-shot flag is `NEO_CES_MOBILE_ADMIN_PREFLIGHT_ON_START` (normally `false`).

**Tests:** dedicated NEO Bots CI passed at feature commit `f827b2abb1adfe62aae55062989aa3eba79a03de`. Render staging build passed **130 tests, zero failed** including cross-origin and unsafe query denial.

**Live read-only result:** The controlled staging run logged `member_session_verified`, `memberAuthenticated:true`, `adminAuthenticated:false`, `adminVerification.navigationVisible:false`, `adminVerification.protectedPageVerified:false` at `2026-11-02T01:54:09Z`. The verified landing page did not contain a discoverable Administration anchor matching the read-only allowlist, and no speculative admin route request was made. This **does not disprove** the user's declared Community Administrator role; it means the bot has not yet established protected admin-page evidence. The single-shot flag was restored to `false` after this check, with a replacement Render deployment.

**Next operational dependency:** Obtain the actual Administration-page navigation/route and confirm it from a logged-in CES account using the normal authorized interface or CES provider documentation. Do not guess authenticated links, copy browser cookies, persist credentials, or request account ownership signing merely from the administrator account identifier. Once the protected administration page can be verified with least-privilege read-only access, review account-control evidence for `NMNIBANK` separately. Remain read-only; no payments, account transfers, Neon migrations, or production DNS changes.

## Verified CES mobile Administrator gate — 2026-11-02 UTC

**User-provided browser evidence:** Authorized CES mobile tab `https://ces.community/manage.php` visibly displayed the Administration interface, Hon. Larry Shelton, and Noocratic Open Market Nibiru Index. Controls shown included Approve new sign-ups, Manage exchange, Transaction report, Send statements and Log Out. This established the reviewed, read-only administrator page URL and its expected account/exchange markers; no browser cookie was copied.

**Source integration:** CES staging branch now permits an exact, reviewed same-origin `GET /manage.php` after a newly verified `NMNI0000` mobile member login. The verification requires Hon. Larry Shelton, Noocratic Open Market Nibiru Index, Administration, logout and multiple administrator controls. It never follows a cross-origin URL, a query-token URL, or an unapproved write action. The proof result is boolean only; passwords, cookies, source HTML and protected account details remain transient.

**Confirmed independent backend proof:** The one-shot Render staging log at `2026-11-02T02:00:29Z` reported `event:ces_nmni_mobile_preflight`, `result:member_session_verified`, `memberAuthenticated:true`, `adminAuthenticated:true`, `adminVerification:{navigationVisible:false,protectedPageVerified:true}`. This verifies the existing Render credentials can authenticate `NMNI0000` and load the protected CES Administration interface server-side without using an open browser session.

**Testing:** Dedicated NEO Bots GitHub CI passed for commit `7ac0829a7dad07c025b1d193c623f95b0e0ccf1e`; Render build reported **131 tests passing, zero failures**. The one-shot `NEO_CES_MOBILE_ADMIN_PREFLIGHT_ON_START` flag was disabled after the check, triggering a replacement staging deployment. Continue to monitor that replacement until live.

**Authority boundary:** Verified Administrator access does *not* automatically prove authorized control of the separate `NMNIBANK` exchange account. The next required evidence is an authenticated read-only CES account record and authorized controller/delegation for `NMNIBANK`, separately from `XCPCBANK`. No account-link attestation keys were activated; no Neon account mapping, money movement, payment, DNS or other production configuration was changed.

**Next gate:** Review the CES Administration page's `Users` (`/members.php`) or `Manage exchange` (`/editexchange.php`) read-only account search capability; use only an exact, reviewed GET path and require independently verified account-specific control. Do not assume an account is owned based solely on its presence in an administrator's list.

## CES Users-route read-only access check — November 1, 2026 local / November 2 UTC

**Confirmed connection:** The user's authenticated CES Administration browser tab exposed `https://ces.community/members.php` labeled `Users`. The server-side NEO CES runtime has now performed a controlled, status-only authenticated GET to that reviewed path, after verifying `NMNI0000` member authentication and exact `/manage.php` administrator controls. It does not parse, return, log, copy or persist the Users-page account listing.

**Result:** Render emitted `ces_nmni_mobile_preflight` at `2026-11-02T02:17:42Z` with `result:member_session_verified`, `memberAuthenticated:true`, `adminAuthenticated:true`, `adminVerification.protectedPageVerified:true`, `usersRoute:{linked:true,reached:true,accountControlVerified:false}`. CES returned a successful response to this protected Users path. This is **access evidence only**, NOT verified ownership of `NMNIBANK` and not permission to move funds.

**Code and tests:** `server/neo-bots/ces-mobile-login-preflight.mjs` gained `checkUsersRoute` behind `NEO_CES_USERS_ROUTE_PREFLIGHT_ON_START` for the existing one-shot Render staging process. The dedicated security tests verify exact reviewed same-origin Users link, GET-only access after administrator verification, no following cross-origin or query-string links, redirect denial, and suppression of list/credential content. GitHub NEO Bots Tests succeeded at commit `fac0d5e856b12cfacf0a2f2363f250b1e6ba226f`. Broad repository CI is independently failing and must not be described as passed.

**Safe shutdown:** After the single live verification, `NEO_CES_USERS_ROUTE_PREFLIGHT_ON_START` was set back to `false` in the NEO SYSTEM Render workspace. The temporary check is not a recurring crawler.

**Next verified prerequisite:** Inspect only the exact `NMNIBANK` record through an approved, minimized CES account view, and establish the authenticated authorized controller/delegation. Avoid bulk member data retrieval, report export, write forms, balances and NEO account linking until separately authorized and technically verified. The CES-side account-control attestor remains disabled and banking financial writes remain off.
