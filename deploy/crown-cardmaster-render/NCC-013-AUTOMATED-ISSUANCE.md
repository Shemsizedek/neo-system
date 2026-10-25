# NCC-013 — Safe automatic Crown enhanced metadata preparation and confirmation

**Environment:** Project 144 / existing `Shemsizedek/neo-system` Crown staging branches only.
**Current status:** code and workflow candidate; no authenticated Crown issuer signer, custom hostname binding, deployed action secret or confirmed TokenScan refresh has been established.

## Live findings (2026-10-25)

1. TokenScan and Counterparty Core both show NOMNI's current description as `https://crown.holytemples.org/assets/NOMNI/tokenscan.json`.
2. Counterparty Core reports NOMNI originally issued by `1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk`, with current owner `18FyntJG9hdXYvanm67mGgbyo1P7adckvg`. A later issuance entry in block **972822** has `asset_events=change_description`, `quantity=0`, and `source=18FyntJG9hdXYvanm67mGgbyo1P7adckvg`. It is not an additional NOMNI supply issuance.
3. Public DNS-over-HTTPS shows `holytemples.org` uses `ns1.wordpress.com`, `ns2.wordpress.com`, `ns3.wordpress.com`. The `crown` hostname has an A record `34.172.66.0`, not a CNAME to either verified Render service. Its canonical JSON could not be independently confirmed as a direct HTTP 200.
4. NOMNI JSON **does** return public HTTP 200 from the existing Render static host `https://neo-crown-cardmaster-staging.onrender.com/assets/NOMNI/tokenscan.json`. The read-only Crown runtime also served this payload correctly on its own hostname; neither alone fixes TokenScan's on-chain URL.
5. Both Render services have auto-deploy set to `no`; the **static site** is the preferred canonical metadata host because the Free web runtime can cold-start. Do not migrate all of `crown.holytemples.org` without checking other currently served routes and verifying a Render custom-domain binding.

## Two-phase publication architecture

### Phase 1 — prepare metadata before signing

- Issuance composer can call `createCrownIssuanceIntentDraft({asset,ownerAddress,quantityRaw,description,website})` to construct the exact canonical URL. Draft is **not approved** and never signs.
- An authorized reviewer approves a PR containing `server/crown-metadata/approved-intents/<ASSET>.json` with the public issuer address, raw issuance quantity, exact description-for-signer, approved metadata and GitHub review reference. **Never put keys, seeds, financial proofs, or private identity into this public repo.**
- On a staging branch push, `.github/workflows/crown-issuance-metadata.yml` validates every approved intent with `--prepare-all`, materializes `tokenscan.json` without replacing conflicting content, and syncs only approved assets to the **existing static Crown branch** `feat/ncc-005-cardmaster-gallery`.
- When the specifically approved repository secret `CROWN_STATIC_RENDER_DEPLOY_HOOK` is configured for the existing Free static service, workflow requests a deploy; otherwise it logs `NOT PUBLICLY SERVED`.
- Pre-sign gate `--verify-all` fetches the exact canonical URL with redirects disabled, validates MIME/JSON/assets and checks every field matches approved content. If unreachable or mismatched, the workflow fails; **the wallet should not sign yet**. The future signer integration must enforce this preflight, not merely display a warning.

### Phase 2 — confirm token issuance

- The user's separately authorized wallet performs and signs the issuance in Counterparty, using the exact metadata URL as on-chain description.
- Issuance frontend/back end must attach the real **transaction hash** to the approved intent (no browser-submitted `verified` flags). The staging workflow can rerun on intent updates or by maintainer `workflow_dispatch`; future production scheduler/webhook needs verified deployment.
- Reconciler fetches, from **fixed official Counterparty Core v2** host: root readiness, current asset, issuance by tx hash, latest block and issuance block. It checks mainnet, server readiness, valid transaction/status, source/issuer addresses, initial issuance height, exact positive raw quantity, unchanged description, unchanged controlling owner, stable block hash and **at least six confirmations**.
- Reconciler refuses description-only events, ambiguous ownership, missing/mismatched confirmation, unrelated/token-owned issuances and bad provider data. It records an idempotent, off-chain receipt in `server/crown-metadata/issuance-receipts` only after a fresh canonical readback.
- TokenScan visibility is **never** marked verified until the third-party explorer actually shows additional information; a metadata receipt cannot control or force TokenScan.

## DNS/TLS activation decision (blocked; do not change in this PR)

1. Confirm the existing Crown hostname's purpose and its current WordPress-hosted routes; save existing DNS settings and a rollback.
2. From the Render dashboard, **first** attach `crown.holytemples.org` as a custom domain to the existing static Crown service. Confirm Render's actual DNS targets and certificate requirements; no new service or paid plan.
3. Once Render confirms configuration and operator approves the hostname migration, update only `crown` DNS in the WordPress.com-managed zone. The likely subdomain target is `neo-crown-cardmaster-staging.onrender.com`, but use the verified target supplied by Render. Preserve apex, mail, unrelated hosts and assets.
4. Independently confirm DNS/TLS propagation and **direct 200 without 301/302**, `application/json`, `asset=NOMNI`, and response time suitable for Counterparty indexers. Check existing Crown pages before/after.
5. Retest TokenScan. Official documentation warns that an already failed enhanced-asset validation may require a new description-only on-chain transaction. That needs current asset controller approval, signed fee review and no supply change. **Do not broadcast automatically.**

## Limits and protection

- The workflow lives on the Crown staging branch, **not the default branch**, so it is currently triggered by staging push/maintainer dispatch, not a guaranteed background schedule. Actual signer commits and Render hook must be connected before calling it end-to-end automatic.
- GitHub PR review references are **operator-declared metadata**, not cryptographically authenticated reviewer evidence; enforce GitHub branch protection and authorized changes.
- Root Counterparty readiness is verified but this uses one public API service, not independent full Bitcoin node consensus. Results are source-backed observations only.
- Conflicting existing metadata or block receipts fail closed and demand manual review. No forced asset replacement, wallet changes, supply manipulation, private key handling, issuer endorsement or financial promotion.
- The scripts use only Node built-ins and the existing free staging services. No background keeper bot, paid storage or account changes.

## Tests / maintenance

```bash
npm run crown:issuance:test
npm run crown:issuance:prepare
npm run crown:issuance:preflight
npm run crown:issuance:confirm
```

No approved live intents exist in the repository at the initial merge. A run reporting `total:0` proves only that scripts execute; it does **not** prove live signer integration or an asset publication. Reconciliation tests inject fixture Counterparty API responses and local temp storage; production activation requires a real, approved mainnet test issuance and canonical readback.

**Next gate:** authorized Crown issuer signing integration plus canonical DNS migration, audited deployment hook, exact TokenScan readback and user-visible issuance status transitions.
