# NCC-019 — NEO Crown Edge Activation Preflight

**Current stage:** code-only, no DNS or edge deployment performed.

The authorized root WordPress connection `holytemples.org` is not proof of control over `crown.holytemples.org`. The connected SentinelX integration inventory currently contains **no Cloudflare integration**, so no Cloudflare zone, DNS record, or Worker route could be verified or changed.

## What this gate adds

Run `node scripts/neo-crown-canonical-preflight.mjs` from a network capable of public HTTPS requests. The script only performs GET and HEAD reads of the exact technical asset metadata path and three safe unrelated Crown paths. It compares canonical JSON with the approved NEO compatibility payload, rejects redirects and non-JSON, and reports response status and SHA-256. It never requests auth tokens, issues a token, signs a transaction, updates DNS or claims public authentication is functional from a 404/401 response.

The output fields `authentication_operationally_verified:false`, `tokenscan_enhanced_display_verified:false` and `safe_to_activate_auto_issuance:false` intentionally **cannot** become true through this read-only smoke. Those require separate owner-authorized functional tests.

## Owner-controlled activation

1. Authorize the actual DNS/edge account controlling `crown.holytemples.org`. Cloudflare may be connected through SentinelX, but an integration connection alone still does not establish control of the relevant authoritative zone.
2. Identify the current Crown auth origin and take a rollback snapshot of current routing. Verify JWT/token/agent-enrollment behavior with approved test identities, never production credentials in automated public probes.
3. Review the narrow NCC-018 `edge/neo-canonical-metadata/worker.mjs` and bind **only** the literal path `/assets/NOMNI/tokenscan.json`, with approved TLS, pricing and DNS ownership.
4. Require exact HTTPS 200 JSON with no redirects, source equality, and all formerly working authentication paths unchanged. Run this preflight from an independent network.
5. Independently verify TokenScan enhanced-information presentation. Only after the operator signs off may the separately drafted NCC-017C auto-issuance schedule be considered.

This is **NEO canonical metadata** publicly; `NOMNI` remains only the immutable technical Counterparty asset ID in exact on-chain URL and provenance.

## Verify locally

```bash
npm run crown:canonical:activation:test
node scripts/neo-crown-canonical-preflight.mjs
```

The second command is expected to exit 2 while the canonical hostname is not serving the approved JSON.

**Rollback:** remove the exact edge route only, preserve the original upstream auth origin and review the route-specific JSON response before retrying.
