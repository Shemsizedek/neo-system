# NOMNI bill circulation gate — draft registry

This internal module prepares serialized one-NOMNI bill records. It is not a
circulation service and has no public API, printer connection, signer, wallet,
funding verifier, issuance command or redemption execution path. No production
database is created by importing it. Callers must explicitly provide a SQLite
filename; tests use disposable local files.

## Implemented

- Persist a draft serial and idempotent request ID transactionally in SQLite.
- Allow only denomination `1` for NOMNI on Counterparty mainnet.
- Bind submitted artwork evidence to the exact existing issuer JPEG SHA-256.
- Reserve a declared transaction-hash/event-index pair against one draft using a
  database uniqueness constraint, including across registry connections.
- Reject wrong asset/network/amount/hash, malformed funding references and unknown
  evidence fields. Evidence fields contain public references only; never pass
  passwords, seed phrases, private keys, passkeys or personal holder details.
- Report missing evidence and activation blockers explicitly. Complete supplied
  evidence remains `SUBMITTED_UNVERIFIED`, `fundingVerified: false`,
  `readyForCirculation: false`, and `circulationEnabled: false`.
- Reject all redemption requests without changing draft state.

A serial is a draft identifier, not an issued note. Funding evidence is a claim,
not proof. The artwork hash identifies bytes, not backing or spend authority.
The duplicate-evidence constraint is local to one authoritative database; it is
not a global double-spend control. Do not create independent production registries.

## Integration contract

```js
import {createBillRegistry} from './registry.mjs';
const drafts = createBillRegistry({filename: '/durable/path/nomni-bills.sqlite'});
// Use an internal request ID, not a person's name or email.
const draft = drafts.reserveDraft({requestId: 'internal-print-request-001'});
const readiness = drafts.assessReadiness(draft.serial);
// readiness.readyForCirculation is false; nothing is printed, funded or redeemed.
drafts.close();
```

An authenticated internal operator service must enforce authority before calling
this module. This module deliberately does not provide an authorization boundary.
SQLite requires one durable shared authority or a reviewed migration to a
transactional central database, plus backup/recovery checks, before live use.
Evidence replacement is draft editing, not an audited circulation ledger.

## Next gate: verified funding and redemption design

Before enabling any physical circulation, choose and review the custody model:
who controls token funds, how each note is funded, and how possession authorizes
redemption. Then connect a trusted ledger verifier for exact NOMNI transfer
events, confirmations, current backing, exclusive allocation and stale/reorg
checks; add authenticated operator approval, a durable audited note state machine,
and a signer-controlled payout flow. Redemption needs atomic claiming, replay
protection, reconciliation after timeouts, and one-time retirement of the note.
Test concurrent redemptions and crash recovery before enabling a funded pilot.
No deployment, token transfer, print run or financial commitment is performed by
this gate. Existing public token metadata and approved description stay unchanged.

## Validation

`node --test server/nomni-bills/*.test.mjs`

Coverage includes restart persistence and idempotency, cross-connection funding
claim conflicts, invalid evidence rejection, missing-evidence reporting, returned
object isolation, and rejection of repeated redemption attempts.
