# NEO NVM / BVM — Gate 5

Gate 5 adds durable one-use approval storage and an identity boundary for the
Gate 4 PSBT reviewer. It is built on Gate 4 commit
`bf72879cb2f49c7769ec240e903fbe764ec6e74e`
([draft PR #1277](https://github.com/Shemsizedek/neo-system/pull/1277)).
The supported Bitcoin network remains **regtest**. The application creates no
Bitcoin signature, invokes no external signer and broadcasts no transaction.

## Identity and approval requirements

`server/neo-vm/neopass-psbt-review.mjs` exports
`createNeopassPsbtReviewer`. The operator must supply all of:

- The existing NEOpass HS256 issuer secret (at least 32 bytes) and exact issuer.
- An authoritative registry implementing `getNEOpassCredential(subject)`, such
  as the existing Firestore Temple registry adapter.
- Explicit, unique subject-to-approver bindings containing **public Ed25519
  keys only**. The Google subject and approver ID are operator-provisioned.
- A real `createSqliteApprovalStore` instance and the restricted, three-method
  Bitcoin Core PSBT RPC adapter.

The reviewer accepts the platform's ordinary NEOpass session profile through
the existing `verifyNeopassToken` cryptographic verifier. It additionally
requires integer issuance and expiry times, a maximum eight-hour session,
current validity and a `google:` subject. A present `nbf` must be satisfied.
Browser oracle tokens, Crown attestation tokens, audience-bearing tokens and
other purpose-scoped tokens are rejected. This gate adds no token issuer or
login endpoint and changes no existing login behavior.

On every request the authoritative record must have the exact subject,
`status: 'active'`, `provider: 'google'` and a matching `providerSubject`.
The registry is read before Core calls, immediately before nonce reservation,
and again after a successful reservation. Registry outages, suspension,
inconsistent identity and expired sessions deny the review. Token role or
email claims confer no approval authority. There is no executive bootstrap,
anonymous fallback or cached-membership fallback. Local and other identity
providers are unsupported by this gate.

The session must also match a separately configured approval key. Gate 4's
Ed25519 proof still binds the exact PSBT bytes, normalized intent, approver ID,
nonce and at most 300-second lifetime. Possessing a valid NEOpass session alone
does not satisfy that proof. Request values and configured bindings are
snapshotted before asynchronous work. Subject identifiers and keys are never
enrolled from the incoming review request.

The repeated identity reads reduce stale authorization during review; they are
not a distributed transaction with the registry. A suspension after the final
read remains possible. A review receipt is an audit result, not a bearer grant
to sign later. A future signer must authenticate again and revalidate the
transaction and chain state at its own authorization boundary.

## Durable nonce reservation

`server/neo-vm/approval-store.mjs` exports `createSqliteApprovalStore`.
It requires an absolute local file path, an operator-controlled directory,
a regular database file with no group/other permissions, and no final symlink.
It refuses memory/relative/URI database paths and never falls back to a Set.
The file is created with mode `0600`; newly created directories use `0700`.
The database uses WAL and `synchronous=FULL`, verified at startup, schema version
1, and a startup integrity check.

A single autocommit `INSERT ... ON CONFLICT(nonce_hash) DO NOTHING` reserves
the nonce. A primary key arbitrates across processes using the **same database
file on the same host**. The default lock timeout is five seconds; a lock,
storage failure or closed store denies approval. Only a committed insert
returns success. Review failures after reservation leave the nonce consumed.

Each row records the nonce-key hash, consumption and expiry times, a
domain-separated subject hash, public approval-key fingerprint, PSBT hash and
intent hash. It stores no session token, raw subject, private key, preimage or
PSBT. The hashes support correlation; they are not anonymous identities or a
tamper-proof ledger. Expired rows are retained, including through key rotation,
so clock rollback or reuse cannot revive a consumed nonce. There is no pruning
endpoint.

This is a single-host storage adapter. Before deploying it, provision a durable
local volume, restrict access to its directory and keep every reviewer on that
host pointed at the same file. WAL is unsuitable for a shared network filesystem.
Independent replicas with separate files do not share replay protection. Do not
replace or roll back the database while reviewers are active. Restoring a stale
backup can lose nonce history; recovery must stop reviewers, invalidate prior
sessions/approval authorities and preserve the complete committed history before
resuming. Host crash durability also depends on the filesystem and storage
honoring synchronization. No deployment or backup recovery is certified here.

## Composition

The operator composes existing services; this example contains no credentials:

```js
const approvalStore = createSqliteApprovalStore({
  filename: '/var/lib/neo-vm/approvals.sqlite',
})
const reviewer = createNeopassPsbtReviewer({
  rpc: createRestrictedPsbtBitcoinRpc(coreConfiguration),
  registry: authoritativeTempleRegistry,
  jwtSecret: provisionedNeopassSecret,
  jwtIssuer: provisionedNeopassIssuer,
  bindings: provisionedPublicApprovalBindings,
  approvalStore,
})
const receipt = await reviewer.review({ token: neopassSession, request })
```

The receipt extends Gate 4's `REVIEW_APPROVED` result with identity source,
subject hash, key fingerprint and SQLite storage metadata. It still states
`bitcoinSignatureCreated: false` and `broadcast: false`.
`inspectConfiguration()` describes configuration structure; it does not prove
live issuer ownership, registry IAM, persistent-volume provisioning or readiness.
The lower-level Gate 4 reviewer remains available for fixture/operator use;
identity-bound callers must use this wrapper. No application route is added.

## Validation

```bash
npm ci --no-audit --no-fund
npm run neo-vm:test
BITCOIND_PATH=/absolute/path/to/verified/bitcoin-31.1/bin/bitcoind npm run neo-vm:identity
npm test
npm run build
```

The VM suite has **100 passing tests**: Gate 4's 78 and 22 new storage/identity
tests. Storage tests exercise six independent child processes racing one nonce,
restart, abrupt process exit without close, expiry/clock rollback, contention,
corruption, unsafe paths, schema version and immutable audit context.
Identity tests use actual NEOpass HMAC signatures and Ed25519 proofs with fixture
registry records. They cover unbound identities, role overrides, wrong keys,
foreign-purpose sessions, expiry, mutation during I/O, suspension before and
after reservation, and replay across instances, restart and key rotation.

The native gate runs **55 selected scenarios** against a fresh Bitcoin Core
31.1 node: 13 Gate 3 regressions, 15 signature/refund cases, 14 Gate 4 PSBT cases
and 13 identity/storage cases. The identity cases use real `decodepsbt` and
`gettxout` calls and a real temporary SQLite database. The process owns its
regtest data directory, disables wallets/networking, has zero peers, leaves the
mempool empty and deletes its temporary data. Fixture identity and approval
keys are test-only. Evidence is in
[`evidence/neo-vm-gate-5.json`](evidence/neo-vm-gate-5.json).

The full configured repository suite passed **978 tests**, with one existing
KI-015 isolated Postgres integration test skipped without database configuration.
The TypeScript/Vite build passed with its existing bundle-size warning. The
architecture audit had zero errors and three existing gap warnings; its three
tests passed. Workflow YAML parsed successfully.

The GitHub VM workflow runs the 100-test suite and this combined native gate.
The existing unrelated Gate 104/107/108 dependency-install failures and Gate 131
missing `riskReview` export remain outside this change.

## Remaining gate

Live NEOpass issuer/registry configuration, a persistent operator-host volume,
and deployment remain pending. No live user has been certified by these fixture
tests. The next gate is a bounded external-signer request/response protocol and
independent final-transaction revalidation on regtest, preserving these durable
identity and approval controls before any production activation.

Implementation references:

- [Node 24 SQLite API](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html).
- [SQLite WAL behavior and host requirements](https://www.sqlite.org/wal.html).
- [SQLite synchronization settings](https://www.sqlite.org/pragma.html#pragma_synchronous).
- [SQLite conflict handling](https://www.sqlite.org/lang_upsert.html).
