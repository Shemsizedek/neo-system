# NCC-017 — NEO Crown Chain Layer 3 automatic issuance-to-showcase publication

**Project:** Project 144 | **Brand:** **NEO canonical metadata**
**Implementation target:** existing `Shemsizedek/neo-system` staging branches, existing Free Render services.
**Scope:** read-only observation of **new Counterparty first-issuance events** and automatic creation of approved NEO Crown showcase files *after confirmation*.

## Brand and protocol identities

Use **NEO** and **NEO canonical metadata** in public titles, navigation, warnings, dashboard labels and user-facing descriptions. Do not market the older ticker as a competing system brand.

**Exception required for correctness:** Bitcoin/Counterparty assets have exact protocol identifiers. Their existing on-chain descriptions, asset names, signed descriptions, indexed explorer URLs and origin files must retain their exact identifiers, e.g. an existing token's `/assets/NOMNI/tokenscan.json` path. Changing an on-chain technical key to the letters `NEO` would break metadata lookup; this is not a cosmetic label. Use the immutable code only as an exact chain identifier or external SEO/indexer URL, not as the NEO ecosystem's brand name.

## Event-to-card stages

<escape>1.</escape> **Approved, unsigned plan.** An operator-reviewed file in `server/crown-metadata/approved-intents/<ASSET>.json` declares the literal Counterparty asset code, controlled public issuer address, raw issue quantity, description URL, public NEO canonical metadata, and optional reviewed `showcase` style/category/title. It must contain no secrets or personal claimants. The approval-reference field is not cryptographic proof of a reviewer; GitHub branch protection and reviewer checks are required for production.

<escape>2.</escape> **Pre-sign metadata.** NCC-013 still stages `tokenscan.json` on the existing Crown static branch and checks that the exact URL embedded in the intended on-chain description returns direct HTTP 200 with approved JSON, *before* signing. Do not change that URL in a signed asset just to satisfy NEO branding.

<escape>3.</escape> **Read-only event discovery.** `neo-issuance-event-observer.mjs` queries only `https://api.counterparty.io:4000/v2/assets/<ASSET>/issuances?limit=100` from a fixed host. It accepts exactly one `asset_events: "creation"` record matching asset, owner/issuer, source, positive exact quantity, signed description and valid transaction hash. Zero-quantity `change_description`, `transfer`, malformed/ambiguous/truncated events never qualify. Missing creation returns `PENDING`. An explicit `tx_hash` in an approved intent is an additional check, not a substitute for source readback.

<escape>4.</escape> **Independent confirmation.** The existing NCC-013 verifier separately checks official Counterparty root mainnet readiness, current asset state, transaction-by-hash, latest block, creation block hash, first-issuance block and at least **six confirmations**. It requires current issuer/owner and description to remain approved. The publisher additionally requires **total current supply exactly equal the initially approved raw quantity** and explicit boolean divisibility/supply lock fields. Any unexpected new mint or transfer blocks publication.

<escape>5.</escape> **Immutable file staging.** `neo-issuance-showcase-publisher.mjs` uses existing Layer 3 classification and artwork engines, then generates four static assets:

```text
apps/neoscan/web/cardmaster/assets/<ASSET>/
  showcase.json
  showcase-front.svg
  showcase-back.svg
  showcase-manifest.json
```

All files derive from the independently checked public ledger snapshot, immutable receipt and operator-approved issuer *presentation* declaration. The category status stays `ISSUER_DECLARED`; legal rights, collateral, custody, reserves, market prices and third-party explorer ingestion remain **unverified**. Both SVG faces are original deterministic off-chain artwork without scripts or external images. No wallet action is performed. Existing bytes are never overwritten silently; conflicts fail the job.

<escape>6.</escape> **Staging GitHub automation.** On a pushed approved-intent change or authorized workflow dispatch, `.github/workflows/crown-issuance-metadata.yml` prepares JSON, commits approved metadata, checks the NEO canonical URL, runs the creation observer and confirmation publisher, commits audited receipts and four card files to the Crown staging branch, and safely mirrors those files to the existing static-card branch `feat/ncc-005-cardmaster-gallery`.

<escape>7.</escape> **Optional existing Render deployment hook.** Only if `CROWN_STATIC_RENDER_DEPLOY_HOOK` has been explicitly configured for the *already existing* Free static site will the workflow request a static deploy. Without the secret, it **must warn that cards are staged in GitHub, not publicly served**. Even when a hook fires, a separate public HTTPS readback is required before claiming publication. It does not alter DNS or add a paid resource.

<escape>8.</escape> **Read-only public access.** The existing Free Crown web runtime can serve the allowlisted `/assets/<ASSET>/showcase*.json` and `/assets/<ASSET>/showcase-(front|back).svg` paths *once deployed from its staging branch*. No public POST/PUT/PATCH endpoints are added, and SVGs use restrictive CSP sandbox. The static host can serve the same committed files once an authorized deploy completes. For published card integrity, verify SHA-256 of returned bytes against the committed manifest.

## Safeguards and limits

- No new token issuance, signing, wallet key access, private data disclosures, asset transfers, on-chain description updates, spending or claims of SEC/legal compliance.
- Existing cards for previously issued assets can still be generated **on demand** via `/showcase/` using public Counterparty observation, but NCC-017's automatic **new issuance** step exclusively matches reviewed first creation transactions. Historical description changes do not backfill new-card "issuance" status.
- Although an authorized creation event can be discovered without a submitted transaction hash, the repository **does not yet have a verified production issuer-signing connection**. A signed transaction from an unrelated wallet is not automatically authorized merely because the API returns a record.
- The exact canonical metadata hostname `crown.holytemples.org` remains an upstream availability gate; the public WordPress/Crown trust routes must be protected (see #1234). Do not repoint the entire hostname to static Render.
- GitHub Actions **scheduled workflows execute from the default branch**. This pipeline lives only on `feat/ncc-007-render-runtime-hardening` while in staging, and its existing triggers are push/authorized dispatch. **Hourly unattended polling is not active** until a separately reviewed default-branch scheduler is installed and verified. Without that scheduler, a creation that occurs after the initial approved-intent push may require another authorized dispatch. Do not report full autopilot.
- The existing static Render site has `autoDeploy:"no"` and the deploy hook secret is not verified. No claim of automatic public hosting can be made without that activation.
- Counterparty Core v2 is a single public data-provider readback, not independent full Bitcoin node consensus. The SHA-256 for a showcase is an off-chain integrity checksum, not an issuer signature or additional token/NFT issuance.
- Financial instrument category is an issuer-reviewed *presentation*, not an authoritative legal classification. Insurance-related public cards omit the names of insured people, claimants and beneficiaries.

## Manual staging acceptance / command set

```bash
npm run crown:showcase:autopublish:test
npm run crown:showcase:watch              # read-only, reports approved events
npm run crown:showcase:stage-confirmed    # gated immutable file writes only
npm test
```

After successful authorized staging and deployment, check:

```text
https://neo-crown-cardmaster-runtime.onrender.com/showcase/
https://neo-crown-cardmaster-runtime.onrender.com/assets/<ASSET>/showcase.json
https://neo-crown-cardmaster-runtime.onrender.com/assets/<ASSET>/showcase-front.svg
https://neo-crown-cardmaster-staging.onrender.com/assets/<ASSET>/showcase-manifest.json
```

These generic example paths are **not** claimed to exist for an arbitrary token. Until a new approved real issuance has been observed and staged, `/assets/<ASSET>/showcase*.json` should return 404. The working on-demand `/api/crown/showcase?asset=<ASSET>` is separate and continues to serve public-ledger observed assets.

## Release decision

Promote code and read-only routes to existing Crown Render staging **only after full CI**. Run a source-backed, **mocked** creation event through tests without submitting a real Bitcoin transaction. Real activation requires approved issuer event workflow, NEO canonical metadata hosting readback, verified GitHub approval process, default-branch scheduler authorization (if hourly checking is desired), authorized static deploy hook and documented live end-to-end test.

**Next dependency gate (NCC-018):** Canonical hostname routing and authentication-safe path deployment; thereafter activate the schedule/deploy hook and independently confirm an actual NEO-issued asset has a published showcase and correctly populated explorer information.
