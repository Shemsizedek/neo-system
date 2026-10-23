# NEOfx — Google Cloud production rollout (Gate 029)

**Target:** https://neofx.holytemples.org
**Runtime:** Google Cloud Run, region us-central1, existing `neo-edge` service.
**Source:** Shemsizedek/neo-system; existing `cloudbuild.neo-edge.yaml`.
**Release posture:** Public informational / read-only broker gateway. Real-money execution OFF.

## Discovery
- `architecture/neo-hosts.json` declares `neofx.holytemples.org` with service `neo-fx`.
- `cloudbuild.neo-edge.yaml` deploys `neo-edge` and attempts mapping for the host.
- `src/neofx/NeoFxApp.tsx` is the current FX UI. Integrate here; do not replace Treasury registry.
- Mapping declared in source is not proof of live DNS or a successful Cloud Run mapping.

## Broker-neutral rollout
1. Public NEO FX directory and Treasury registry (no order submissions).
2. Per-broker read-only account enrollment after NEO Pass authorization. Never co-mingle broker custody accounts.
3. Regional entitlement matrix; product/country restrictions, feed licensing, KYC and verification.
4. Paper trading with per-account risk controls, observable audit, broker-specific sandbox certification.
5. Dedicated live execution approval per broker and account; require kill switch, position/reconciliation controls and rollback. No automatic live enabling.

Candidate integration families: Interactive Brokers (multi-asset); OANDA (FX, eligible regions); individual MT4/MT5 brokers; separately controlled BTC/Counterparty access. These are proposals, not contracts, connected accounts or operating licenses.

## Google Cloud release gate
- Validate build/tests and pull-request review before merging to main.
- Confirm the Cloud Build trigger project, principal and source ref; do not assume merges automatically deploy.
- Verify service/account IAM, Artifact Registry and pinned immutable image SHA.
- Ensure privileged API routes reject unauthenticated requests. Current `neo-edge` Cloud Build uses `--allow-unauthenticated`; public gateway must not expose private broker/order endpoints on that trust boundary.
- Confirm Cloud Run mapping and TLS: `gcloud run domain-mappings describe --domain neofx.holytemples.org --region us-central1`.
- Confirm authoritative DNS and cert status; update records only when provider-required values are verified.
- Probe `https://neofx.holytemples.org` for 200, valid TLS, correct FX UI and no exposed secrets.
- Run smoke test with paper-only and live-order flag OFF.
- Record revision/image, health, rollback target; shift traffic only after checks and user-approved release.
- Rollback Cloud Run traffic to verified previous stable revision if probes fail.

## Production activation gates (default disabled)
`NEO_FX_LIVE_TRADING=false`
`NEO_FX_BROKER_CONNECTORS_READ_ONLY=true`
`NEO_FX_GUARDIAN_TRANSPORT_ENABLED=false`

Do not place credentials in Git. Use GCP Secret Manager and IAM; protect order routes independently.
