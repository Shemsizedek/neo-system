# NCC-012 — NOMNI TokenScan enhanced metadata incident and issuance contract

## Verified incident, October 25, 2026

- `https://tokenscan.io/api/asset/NOMNI` returned asset `NOMNI` with description **exactly** `https://crown.holytemples.org/assets/NOMNI/tokenscan.json`. Its `issuer` and current `owner` are different addresses; neither should be inferred to be a connected signing wallet.
- TokenScan's public NOMNI asset page displayed **No additional information is available at this time**.
- The canonical `crown.holytemples.org` JSON URL did not return a verified successful response during inspection. The separately committed Crown metadata adapter originally contained a wrong file path in a different revision; code in GitHub is not proof that the canonical domain publishes it.
- Official Counterparty enhanced metadata requires a direct `200`, **no redirects**, asset-matching JSON, and valid fields. The icon may be omitted; if present, it must be 48x48 RGB/RGBA PNG from an HTTPS .png URL. Unverified artwork/source links have been omitted from the initial compatibility payload.
- Counterparty's legacy indexer might not retry a description that repeatedly failed after initial issuance. A **description-only on-chain transaction may eventually be necessary**, but must be approved and signed by a verified current controlling wallet. NO such transaction is made in this gate.

## Implemented staging repair

1. A deliberately minimal, validated `NOMNI` enhanced JSON is committed to `apps/neoscan/web/cardmaster/assets/NOMNI/tokenscan.json`. It explicitly avoids unsupported financial claims, reserve attestations and inferred prices.
2. Existing free Render Crown static site serves `https://neo-crown-cardmaster-staging.onrender.com/assets/NOMNI/tokenscan.json` with direct HTTP 200. This **does not yet fix** the on-chain URL; DNS/hosting for `crown.holytemples.org` must map to a host serving this same path directly without rewriting the URL.
3. The Crown runtime has a pinned read-only route for the same asset and a staging manifest. It never accepts public writes or serves arbitrary local files.
4. Automated HTTP tests cover content type, no redirect, exact asset name, path rejection and GET-only behavior.

## Required canonical-domain routing

- Check who controls authoritative DNS/hosting for `crown.holytemples.org`, and whether a custom domain is already bound to another service. **Never replace an unknown CNAME or production route blindly**.
- After operator DNS/hosting approval, serve the same payload at `https://crown.holytemples.org/assets/NOMNI/tokenscan.json` using a host with this exact path. No 301/302; direct JSON `application/json` with 200. No generic WordPress page or login gate.
- Validate the canonical hostname/TLS certificate, JSON schema and URL reachability from a separate public client. Confirm TokenScan refreshed the description and enhancement. A successful mirror URL alone does not imply TokenScan ingested it.

## Pre-issuance metadata automation contract (code ready, not wired to a live signer)

`server/crown-metadata/issuance-autopublish.mjs` offers:

1. `prepareCrownIssuance`—constructs **before signing** the exact description `https://crown.holytemples.org/assets/<ASSET>/tokenscan.json`, plus a sanitized strict legacy JSON. The signer must show this URL alongside quantity, owner and fee; the module never signs or broadcasts.
2. `verifyIssuanceForMetadata`—accepts only a **confirmed Bitcoin mainnet Counterparty** issuer event with the expected asset, issuer, description, confirmed tx hash, block and current asset description. It requires an independent trusted adapter to fetch and validate the Counterparty evidence; an untrusted webhook's `verified_from_counterparty_api` boolean alone must never be elevated to verification.
3. Returns a deterministic static file target and a provenance receipt, **ready for a gated publishing/deployment adapter**. This step does not itself write to GitHub, mutate a live service or create a wallet transaction.

### Next connection needed for full hands-off issuance

- Wire the Crown issuance composer to `prepareCrownIssuance` before requesting a user signature.
- After independently confirming the transaction from Counterparty Core, have a secured, authenticated job call `verifyIssuanceForMetadata`. Generate & review the strict asset file and immutable ledger receipt.
- Set up authorized durable publishing (staged GitHub or authenticated object storage) with asset ownership/rights policy, idempotency, retry/backoff, signed audit trail and optional deployment. Do not allow anyone to submit a fabricated issuance object to create public metadata.
- Run a fresh canonical-host HTTP readback. Only then mark `METADATA_PUBLIC`. Independently confirm TokenScan ingestion before marking `EXPLORER_VISIBLE`. If TokenScan does not refresh, refer description update to wallet owner; **never automatically sign or reissue**.
- The current NEO Tokenworks engine is a sandbox, not proof of active mainnet issuance signer integration.

## Hard blockers to closing NOMNI TokenScan display

1. DNS and live hosting for `crown.holytemples.org` (canonical on-chain URL).
2. Independent TokenScan readback after canonical URL is valid.
3. A signed description-update transaction only if the indexer will not retry, and only after approval from the **current authorized asset controller**.

## Operator safety

No supply change, wallet key access, issuer ownership claim, paid platform, new hosting instance, or on-chain broadcast is authorized or executed here. Image/financial enrichment remains opt-in and must be reviewed.
