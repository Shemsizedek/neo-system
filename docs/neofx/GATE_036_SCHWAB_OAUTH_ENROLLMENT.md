# NEO-FX-036 — Schwab OAuth onboarding (trust account, read-only first)

Status: AUTHORIZED TRUSTEE SELF-ATTESTATION RECEIVED; SCHWAB DEVELOPER REGISTRATION NOT VERIFIED; OAUTH NOT STARTED; LIVE EXECUTION DISABLED.

## Applicant and authorization boundary
- The user confirms they are an authorized trustee / trading representative for the existing Shamuel Family Trust Schwab account.
- The Schwab account is separate from Shelton Estate & Co.'s planned business broker accounts and from NEO Treasury wallets.
- Prior financial aggregator connectivity is *not* Schwab OAuth authorization to NEO FX.
- No account numbers, client IDs, secrets, identity documents, balances, beneficiary records, or tax IDs should be committed to this repository.

## Official workflow
1. Register or sign into https://developer.schwab.com/ as the actual authorized developer.
2. Determine correct Schwab API product and applicant eligibility for an existing trust account; the portal distinguishes 'Myself' from 'Retail Clients'/fintech use cases. Do NOT assume an individual Trader API product permits multi-client aggregation or outside-trust execution.
3. Register NEO FX app with display name `NEO FX — Shamuel Family Trust` (portal eligibility/approval may require a different registered owner). Request eligible accounts and market data products.
4. Configure HTTPS redirect URI (proposal only, not yet deployed): `https://neofx.holytemples.org/api/integrations/schwab/oauth/callback`. Confirm exact string with Schwab app approval.
5. **Before** launching any authorization URL, deploy the private OAuth callback with CSRF state/nonce, exact redirect validation, PKCE if supported, encrypted token storage, secure cookie/session binding and audit logging. Run callback on authenticated private service, not unprotected public exchange routes.
6. The trustee uses Schwab's official consent screen, selecting only eligible trust account(s). Never ask for Schwab password in NEO FX/ChatGPT.
7. Token exchange and refresh are server-only using Google Secret Manager, least-privilege Cloud Run service identity, strict scopes, redaction and rotation.
8. Reconcile masked accounts and read-only positions / balances / order history against Schwab-reported timestamps. Clearly label stale data. Keep import separate from other NEO tenants.
9. Block all POST/PATCH/DELETE trading routes and set `NEO_FX_LIVE_TRADING=false`. Later trade controls require new explicit activation, broker permission validation, sandbox and risk certification.

## Source documents
- https://developer.schwab.com/
- https://developer.schwab.com/user-guides/get-started/authenticate-with-oauth
- https://developer.schwab.com/products/trader-api--individual

## Required attestations/proofs before API connection
- Developer portal account & associated organization approved.
- Schwab API product eligibility for trust and NEO FX use case.
- Registered redirect URI and application status approved.
- Google Cloud project, Secret Manager, IAM, secure callback deployed and tested.
- Authorized Schwab consent successfully completed with account selection.
- Connection test uses only read-only approved endpoints.

## Next gating milestone
NEO-FX-037: deploy authorized OAuth callback to existing Google Cloud infrastructure, verify Schwab developer product and execute read-only account consent.
