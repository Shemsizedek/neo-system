# Project 144 — Cherokee Trinity integration

Gate: CT-001, repository and metadata reference bridge. This implementation adds a NEO-side reference catalog; it is not a deployed cross-chain transfer service.

Active direction, updated 2026-10-29: NEOsync requested retokenization of HALI, TSDU and WAYA on Bitcoin through Counterparty. The [Counterparty migration toolkit and next gates](CHEROKEE-TRINITY-COUNTERPARTY-RETOKENIZATION.md) extend this source-reference foundation. XPR remains the origin for provenance, holder snapshots and retirement evidence.

## Evidence and scope

NEOsync reported the partnership on 2026-10-29 and requested a bridge between `Shemsizedek/neo-system` and [`kburrjr/cherokee-trinity-token-system`](https://github.com/kburrjr/cherokee-trinity-token-system).

Repository inspection verified NEO write access and partner read access. Partner write access was not available. The partner snapshot at [`b2ede5f6fdd2ece75c0bda11621f13832e50eb61`](https://github.com/kburrjr/cherokee-trinity-token-system/tree/b2ede5f6fdd2ece75c0bda11621f13832e50eb61) contains three Markdown files: the README, ecosystem overview and commercial standards. Four technical specification PDFs linked by the README are absent. No contract implementation, ABI, test suite, audited deployment evidence or API implementation is present in that snapshot.

The documentation declares the following facts. They remain `PARTNER_DECLARED` until verified against an approved network endpoint.

| Token | Declared role | Declared supply | Precision | Issuer / contract |
| --- | --- | --- | --- | --- |
| HALI | Recognition and governance | 777777000.0000 | 4 | kburrjr / tokencreate |
| TSDU | Rewards and utility | 6400000000.0000 | 4 | kburrjr / tokencreate |
| WAYA | Security and governance coordination | 3141592653.0000 | 4 | kburrjr / tokencreate |

These are XPR Network references. They are not Bitcoin, Counterparty or NOMNI assets. `xpr-network:tokencreate:HALI` and its counterparts are internal NEO catalog identifiers, not verified CAIP identifiers. The chain ID and RPC endpoint remain unset.

## Architecture inventory

| Component | Location | Responsibility |
| --- | --- | --- |
| Partner register | `registry/partners/cherokee-trinity.json` | Source commit, document fingerprints, declared token metadata, owners and blockers |
| NEO Tokenworks adapter | `server/neo-tokenworks/partner-bridge.mjs` | Read-only partner and asset catalog; rejects capability escalation |
| Tokenworks HTTP server | `server/neo-tokenworks/server.mjs` | Public GET routes for the catalog; partner writes return 405 |
| Source verifier | `integrations/cherokee-trinity/source-verifier.mjs` | SHA-256, Git blob digest, byte count, checkout commit and upstream-head checks |
| Retokenization policy and planner | `registry/partners/cherokee-trinity-counterparty.json`, `server/neo-tokenworks/retokenization.mjs` | Proposed 1:1 Bitcoin/Counterparty mapping and exact supply reconciliation |
| Counterparty preflight | `integrations/cherokee-trinity/counterparty-preflight.mjs` | Read-only mainnet readiness, existing asset owners and preferred-name observations |
| Operator command | `scripts/verify-cherokee-trinity.mjs` | Emits a verification report and a failing exit status for drift or unavailable evidence |
| CI gate | `.github/workflows/cherokee-trinity-reference-bridge.yml` | Tests the adapter and verifies a separate checkout of the pinned partner documents |

The bridge extends the existing Tokenworks runtime. It creates no new service, hosting account, database, token allowance, identity grant or deployment workflow. NEO Scan and other clients can consume the catalog contract when their integration is implemented; this gate does not claim those clients are already connected.

Source hashes establish document integrity. They do not verify token ownership, balances, deployment, contract behavior, asset backing, market value, legal authority or a signed partnership agreement. API responses say `PINNED_NOT_LIVE_CHECKED`; only an explicit source-check report records an observation of upstream state.

## API contract

Start the existing server with `npm run neo-tokenworks:server` (default port 8794).

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/v1/tokenworks/capabilities` | Existing capabilities plus the read-only partner bridge capabilities |
| GET | `/api/v1/tokenworks/partners` | Partner catalog |
| GET | `/api/v1/tokenworks/partners/cherokee-trinity` | Pinned manifest and unresolved dependencies |
| GET | `/api/v1/tokenworks/partners/cherokee-trinity/assets` | Three namespaced asset references with decimal-string supplies and provenance |
| GET | `/api/v1/tokenworks/partners/cherokee-trinity/retokenization` | Counterparty migration draft, quantities, templates and unresolved evidence |
| POST / PUT / PATCH / DELETE | `/api/v1/tokenworks/partners` and descendants | 405 `partner_bridge_read_only` |

Unknown partner or asset-route paths return 404. The catalog reads a reviewed local manifest. Serving a request does not fetch external content or execute foreign code. No secrets or account information are needed for these public references. Existing Tokenworks Crown authorization is preserved for its other routes.

## Verification and operations

```bash
# Adapter, API, capability boundary and source-verifier tests
npm run neo-tokenworks:test

# Compare an existing local partner checkout with the reviewed commit and bytes
node scripts/verify-cherokee-trinity.mjs --checkout ../partner-cherokee-trinity

# Explicit read-only check of current upstream head and commit-pinned file content
node scripts/verify-cherokee-trinity.mjs --live
```

The live command makes only GET requests to fixed GitHub API paths. It uses no credentials, rejects redirects, limits response size and uses a ten-second request timeout. An unavailable, rate-limited or malformed response fails the command. Upstream-head drift fails even when the original pinned documents remain intact. A successful source check never enables financial operations.

Validation on 2026-10-29 after the retokenization update: Tokenworks tests passed 26/26; the full `npm test` run passed 897 tests with one skipped and no failures; `npm run build` passed. The source-integrity checks previously verified all three document fingerprints and the pinned commit; the unchanged source fingerprints remain pinned. A separate live Counterparty preflight is recorded in the migration document. These results verify this code and the recorded observations, not a deployed API or token transfer.

To update the pin, inspect the new partner commit, review metadata and terms, update the manifest and fingerprints, run the source check and tests, and submit a NEO pull request. Do not automatically ingest or execute new partner code. There is no scheduled synchronization in this gate.

Rollback: revert the integration commit and restart the existing Tokenworks runtime through its normal release process. This bridge has no persistent state, custody, signing keys or remote write side effects to migrate.

## Project register and prioritized backlog

Owners below name the responsible project role or repository owner; they do not assert a new assignment or commitment from the partner.

| Priority / gate | Purpose | Owner | Dependencies | Status |
| --- | --- | --- | --- | --- |
| P0 / CT-001 | Establish the NEO repository and metadata bridge | NEOsync / NEO technical operations | Read access to partner documents | Implemented for source review; deployment not asserted |
| P1 / CT-002 | Prepare Counterparty retokenization and source reconciliation | NEO technical operations; partner supplies source evidence | Verified XPR snapshot and issuer mandate | Planner and read-only Counterparty preflight implemented; source evidence pending |
| P1 / CT-003 | Verify target ownership and source retirement terms | NEOsync and partner technical owner | Bitcoin issuer proof, existing HALI owner proof, source retirement and holder claim policy | Pending evidence; no authority or federation granted |
| P1 / CT-004 | Reconcile commercial reference data | Partner document owner | Corrected ratios and arithmetic; financial review | Open; no pricing imported |
| P2 / CT-005 | Rehearse and validate Counterparty migration | NEOsync, partner technical owner and qualified reviewers | CT-002–004; source retirement, claim ledger, rehearsal, approved fees and legal/compliance validation | Blocked; compose, sign, broadcast, custody, swap and settlement disabled |

The commercial standards' HALI-to-TSDU ratios do not reconcile with their USD par-value ratio; their composite Council Unit arithmetic also needs reconciliation. This gate imports no par values, exchange rates, collateral values, yield calculations or redemption guarantees. The document's legal and accounting classifications remain source claims awaiting appropriate validation.

## Integration checklist

- [x] Verify both repository identities and access levels.
- [x] Inspect the partner tree and identify missing specifications.
- [x] Pin the reviewed source and three file fingerprints without copying the partner documents.
- [x] Add the Tokenworks catalog and source-verification command.
- [x] Cover mutations, provenance, response isolation, drift and upstream failures with tests.
- [x] Implement the Bitcoin/Counterparty migration planner, read-only asset preflight and supply arithmetic checks.
- [ ] Merge and release the NEO-side reference bridge through normal repository controls.
- [ ] Obtain and validate CT-002 evidence before exposing live balances.
- [ ] Agree CT-003 ownership proofs and permissions before mapping accounts or roles.
- [ ] Resolve CT-004 and complete CT-005 before any financial activation.

## Decision log

| ID | Date | Decision | Reason |
| --- | --- | --- | --- |
| CT-D01 | 2026-10-29 | Extend NEO Tokenworks with a reference adapter | Reuses the existing token integration boundary and avoids new infrastructure |
| CT-D02 | 2026-10-29 | Keep the partner repo external and pin source fingerprints | Preserves independent ownership and makes drift reviewable |
| CT-D03 | 2026-10-29 | Import declared identity metadata only | Contract implementation, deployed behavior and commercial terms are not verified |
| CT-D04 | 2026-10-29 | Keep authentication and wallet signing independent | A repository partnership grants neither NEO roles nor authority over partner wallets |

Next milestone: verify the partner's Bitcoin issuance authority and existing HALI ownership, then approve the XPR snapshot and retirement procedure for the Counterparty migration. Subsequent NeoMask signing, NEO Counter checkout and NOMNI conversion remain separate integrations with their own tests and release gates.
