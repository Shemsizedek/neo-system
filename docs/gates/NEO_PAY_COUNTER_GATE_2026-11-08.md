# NEO Pay / NEO Counter — payment evidence gate

Date: 2026-11-08. Source baseline: 1ab53201bdef4fe96b68e9774e8b2531b4eb7c41.

## Outcome

Counterparty receive matching now rejects incomplete payment evidence before returning a confirmed observation. This is a source change with synthetic checks, not a verified live checkout or deployment.

## VERIFY / CONNECT

- Verified GitHub access to Shemsizedek/neo-system and inspected the existing Counter application, payment observer, merchant authentication, NEO Pay PSBT flow and NeoMask SDK/bridge.
- `apps/neo-counter/src/auth/session.ts` currently calls the terminal/staff credential endpoint. A complete NEOpass-to-NeoMask Counter checkout was not demonstrated.
- Counter uses one configured receive address and a time/amount matching heuristic. An independently enforced order-to-payment allocation and replay guard are still required.
- The operations control center returned baseline revision 0 with unknown workstream health. It supplies no live-payment readiness evidence.

## BUILD

The Counterparty observer previously accepted raw quantity/amount fallbacks, absent/unparseable timestamps, and event identifiers as transaction references. The new pure matcher requires:

- Explicit destination and asset matching the expected payment.
- A positive normalized asset quantity, compared in integer units at eight decimal places; raw protocol quantities are never assumed to be whole asset units.
- A parseable timezone-qualified timestamp or integer Unix-seconds block time at or after checkout start.
- A positive integer block index, a 64-character hexadecimal transaction hash, and no explicitly invalid status.

Unsupported/incomplete provider shapes fail closed. This may reject legitimate payments if the configured provider does not expose these fields; validate its schema before release. No fallback to weaker evidence should be added.

## TEST

Passed locally:

- `npm run test:gateway` — gateway money assertions plus positive payment fixtures, 25 rejected row fixtures, invalid expected-input cases and a one-unit precision case.
- `npm run typecheck`.
- `npm run build`.
- `git diff --check`.

Dependencies installed without lifecycle scripts or lockfile changes. Synthetic tests do not verify the live Counterparty endpoint, node synchronization, chain inclusion, merchant authentication, wallet signing, browser checkout or order reconciliation.

## DEPLOY

Pending review and merge. No production deployment, wallet signing, broadcast, funds movement or real payment test performed.

## DOCUMENT / NEXT GATE

Priority backlog and acceptance:

1. Bind verified payments to merchant/order/asset/amount/destination/network server-side; atomically reject reuse of the same payment event across orders. Test simultaneous orders and repeated callbacks.
2. Read-only validate configured Counterparty response shape and independent node inclusion, confirmations and reorganization handling. Test valid, stale, invalid and orphaned transfers.
3. Reject expired quotes and test quote changes during asynchronous observation; review Bitcoin observation precision and address reuse separately.
4. Connect an authorized synthetic NEOpass identity and NeoMask test wallet in isolated staging. Demonstrate sign-in, explicit transaction approval, observed settlement and merchant receipt with zero live funds.
5. Independently verify reference and payment expectations before fulfillment; browser return parameters remain untrusted.

No stablecoin issuance or regulated fiat transfer capability is introduced by this gate.
