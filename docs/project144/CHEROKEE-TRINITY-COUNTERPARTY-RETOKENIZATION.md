# Cherokee Trinity — Counterparty retokenization on Bitcoin

NEOsync's 2026-10-29 direction is to retokenize HALI, TSDU and WAYA on Bitcoin through Counterparty. This is now the active integration objective. The implementation prepares exact quantities, source-to-target mappings, read-only mainnet checks and supply reconciliation. No assets have been issued, reserved, signed, broadcast, locked or retired by this work.

## Proposed migration terms

The destination is Bitcoin mainnet / Counterparty. The proposed unit mapping is one original token to one target token. The unit ratio and source-retirement method still need the original issuer's approval. The current draft conservatively requires retirement or an approved equivalent disablement of source units before issuing their replacements. A snapshot alone does not retire tokens or prevent further XPR issuance.

Declared source supplies are planning caps, not verified balances or authorization to mint. Initial draft issuance quantity is zero. Existing-name ownership, actual source supply and holder entitlements must be resolved before positive issuance.

| Source token | Preferred Counterparty name | Declared maximum units | Proposed divisible raw-unit cap |
| --- | --- | --- | --- |
| HALI | HALI | 777777000.0000 | 77777700000000000 |
| TSDU | TSDU | 6400000000.0000 | 640000000000000000 |
| WAYA | WAYA | 3141592653.0000 | 314159265300000000 |

Counterparty divisible assets use eight decimal places. The source declaration uses four. One source raw unit (0.0001 token) maps exactly to 10000 target raw units. The planner uses integer arithmetic and JSON decimal strings; quantities never pass through JavaScript floating-point conversion. All three declared caps fit the current Core signed 64-bit quantity limit.

The four-decimal restriction applies to migration claims and issuance reconciliation. It does not restrict ordinary Counterparty transfers to four decimals; the target protocol supports eight. The application must state this distinction in holder terms.

Sources checked: [Counterparty protocol specification](https://docs.counterparty.io/docs/advanced/protocol/), [current Core configuration](https://github.com/CounterpartyXCP/counterparty-core/blob/master/counterparty-core/counterpartycore/lib/config.py), [Core API reference](https://apidocs.counterparty.io/). Current compose responses and fee estimates require revalidation before financial execution.

## Live preflight evidence

The [saved mainnet observation](../../integrations/cherokee-trinity/counterparty-preflight-2026-10-29.json) was collected at 2026-10-29T04:43:13.571Z. The node reported mainnet, ready, Core 11.5.0 and synchronized Bitcoin/Counterparty height 973644. This records one API observation, not an independent validation of Bitcoin consensus.

| Preferred name | Observed result | Required action |
| --- | --- | --- |
| HALI | Registered, divisible, unlocked; raw supply 0; owner `1CZzkchCa3bJqihFkrqCGfH67HSWk9U3BB` | Prove that the original issuer controls or has authorized the current Counterparty owner. Do not overwrite metadata or assume new-name availability. |
| TSDU | Node returned 404 `Not found` | Recheck at signing time; this observation reserves nothing. |
| WAYA | Node returned 404 `Not found` | Recheck at signing time; this observation reserves nothing. |

If HALI's current owner is unrelated and cannot authorize its use, the partner must approve an alternate Counterparty identifier. Preferred names and matching ticker text do not establish ownership, reserve a name or move rights between chains.

The reader only requests `/v2/` and `/v2/assets/HALI`, `/TSDU`, `/WAYA`. It checks node-declared network/readiness, rejects redirects, bounds response size and fails closed on unavailable, stale or invalid observations. It makes no compose or broadcast requests and uses no credentials.

## Runnable toolkit

```bash
# Static migration draft, quantity caps and non-executable request templates
node scripts/cherokee-retokenization.mjs --plan

# Fresh read-only Counterparty name/owner observation
node scripts/cherokee-retokenization.mjs --preflight

# Arithmetic check of operator-supplied quantities
node scripts/cherokee-retokenization.mjs --reconcile quantities.json

npm run neo-tokenworks:test
```

Example `quantities.json`, containing illustrative figures rather than verified chain evidence:

```json
{
  "symbol": "TSDU",
  "retiredSourceQuantity": "10.0001",
  "remainingSourceQuantity": "6399999989.9999",
  "issuedTargetQuantity": "10.00010000"
}
```

The reconciler detects issuance above reported source retirement, combined supply above the declared cap, inconsistent source totals and target issuance beyond source claim precision. A passing arithmetic check always retains `sourceEvidenceVerified: false`, `issuerAuthorityVerified: false` and `executionEnabled: false`. It is not a durable claims ledger and does not independently validate a source retirement.

The existing Tokenworks server exposes the same draft at `GET /api/v1/tokenworks/partners/cherokee-trinity/retokenization`. The underlying XPR reference catalog remains available for provenance. Public API requests do not trigger remote network calls or financial operations.

Validation on 2026-10-29: 26 Tokenworks tests passed; the full suite passed 897 tests with one skipped and no failures; the production build passed. Tests cover exact quantities, supply overflow, unretired and duplicate supply, API write rejection, lost integer precision, existing names, unready/wrong-network nodes and failed or oversized upstream responses.

## Release sequence and remaining gates

1. Verify the partner issuer's written migration mandate and chosen Bitcoin issuance address through a suitable ownership challenge. Resolve existing HALI ownership before touching that asset. Never request private keys or seed phrases.
2. Verify XPR contracts, issuer permissions and holder balances at an agreed irreversible block. Include treasury, burned, staked, locked and pending amounts. Establish the actual cap and the correct beneficiary for every allocation.
3. Approve the source retirement/disablement mechanism and holder terms. Define the failure and rollback process for any source action followed by failed target issuance. If source and target are intended to remain active together, replace this one-way proposal with an explicitly approved backing and redemption design.
4. Implement a durable claim registry keyed by source chain, contract, asset, retirement transaction/event and beneficiary. Validate source finality, destination ownership, deduplication and reorg handling independently of submitted arithmetic.
5. Rehearse Counterparty reservation, issuance, distribution, reconciliation and final lock behavior on regtest or an approved test network. Unit tests in this gate are not an on-chain rehearsal.
6. Approve names, metadata, migration quantities, holder rights, treasury allocations, fee budget and applicable compliance requirements. Recheck live name ownership and balances. Only then prepare externally reviewed unsigned transactions for the authorized wallet.
7. After verified source retirement, issue/distribute the approved replacement quantities. Reconcile independently. Treat final supply locking as a separate irreversible decision after migration closeout.

Governance voting, the stated 18-month HALI staking behavior, reward distribution and TSDU's stated automatic transfer burn do not migrate through ordinary Counterparty issuance. They need explicit application logic, holder terms and validation. Metadata can describe these rules; it cannot enforce them by itself.

No price, par value, collateral value, redemption guarantee or legal classification is imported from the original commercial-standards document. Its unresolved ratios remain outside the migration arithmetic.

## Decisions

| ID | Decision | Status |
| --- | --- | --- |
| CT-D05 | Use Bitcoin / Counterparty as the retokenization destination | User-directed |
| CT-D06 | Preserve a proposed 1:1 token unit mapping with divisible eight-decimal target assets | Proposed; issuer terms pending |
| CT-D07 | Require source retirement before positive target issuance in the default migration model | Conservative proposal; actual mechanism pending |
| CT-D08 | Retain all execution flags as false; keep source and target identities distinct | Implemented |

Next dependency: proof of the partner's Bitcoin issuance authority, including whether they control the existing HALI owner address, followed by an approved XPR snapshot and retirement procedure.
