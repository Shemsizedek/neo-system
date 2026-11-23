# NEO FX 032 — Broker activation and Google Cloud feed certification

Target: neofx.holytemples.org | Runtime: Google Cloud Run us-central1 | State: BLOCKED until independently verified.

## Current gate findings
- Read-only feed route is committed to development branch but not verified in Cloud Build.
- Existing repository uses mempool.space BTC/USD, CoinGecko XCP/USD, Frankfurter USD/fiat and Counterparty DEX-derived NOMNI cross-rates.
- A GitHub Vercel success check is not proof of Google Cloud Run deployment.
- Production HTTPS endpoint could not be retrieved from the current verification environment.
- No authorized live broker connection, account permissions, secure credential storage, or broker sandbox certification has been confirmed.

## Required Google Cloud checks
1. Merge reviewed PR only after CI and independent code review; confirm Cloud Build trigger for main.
2. Run gcloud builds list --project "$PROJECT_ID" --limit 5 and inspect successful build provenance.
3. Confirm exact Cloud Run image digest/revision and service health (region us-central1).
4. Confirm valid Cloud Run domain mapping, authoritative DNS, TLS and NEO FX route.
5. Curl /api/markets/tickers?market=fx twice; check source, timestamp, numeric validity, staleness, no synthetic substitutions; ensure NOMNI derived reference quote is NOT executable.
6. Enable logging/alerts; preserve rollback revision; record receipt of deployment.

## Per-broker onboarding (no secrets in Git)
Each tenant/broker connection requires: provider and country; broker-owned account ID; broker-signed or OAuth authorization; least privilege; venue/exchange and licensed data entitlements; permitted instruments; KYC/AML/sanctions compliance where applicable; session expiry/revocation; read-only portfolio reconciliation; sandbox order simulations; order-size and exposure limits; kill switch; duplicate-order protections; operator approval; custodian custody separation; immutable audit; position/settlement reconciliation; rollback/incident playbook.

Broker statuses: DISCOVERED -> USER_AUTHORIZED -> READ_ONLY_VERIFIED -> SANDBOX_CERTIFIED -> LIVE_PREAPPROVED -> LIVE_ENABLED (per broker, account and asset class; default BLOCKED).

**No LIVE_ENABLED transition** merely because a user says "activate". Require confirmed credentials, provider-approved entitlements and completed certification evidence. If the broker is absent, onboarding must stop at DISCOVERED.

Never place live order credentials in public frontend, config files or Git commits. Use Secret Manager and dedicated service identity; consider broker gateway isolated from unauthenticated neo-edge.

## Proposed launch order
- Public reference market feed + source provenance.
- Read-only broker accounts (Interactive Brokers; OANDA; eligible MT brokers).
- Securities market data vendor entitlements (commercial).
- Sandboxed order router, pretrade checks and outbox.
- Live-enabled per-account release only after all evidence and approvals.

## Rollback
Immediately disable LIVE_ENABLED for each account via server-side flag and revoke broker gateway token if needed; shift Cloud Run traffic to verified previous revision, audit and reconcile any in-flight orders. A UI switch by itself is not an execution kill switch.
