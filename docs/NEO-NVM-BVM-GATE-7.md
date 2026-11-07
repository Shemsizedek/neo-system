# NEO NVM / BVM — Gate 7

Gate 7 adds cryptographic signer pairing, revocation and durable signing-outcome
records to Gate 6 commit `39b5a5b89d69191a70e6cab1cbbc5721d077a7db`
([draft PR #1294](https://github.com/Shemsizedek/neo-system/pull/1294)).
It also adds a read-only staging preflight. All supported signing remains regtest.

## Pairing authority

`createSignerPairingAuthority` requires the existing NEOpass session/active-registry
authority, operator public approval keys, the durable approval store, and separately
provisioned device pins. Each device pin includes the signer ID, raw 32-byte Ed25519
response public key and exact signer endpoint. A saved browser record or a claimed
device name does not supply this key or establish signer ownership.

The operator signs a domain-separated pairing approval containing the canonical
proposal hash, operator ID, nonce, issuance and expiry. A proposal specifies:

- Version 1 and regtest network.
- Signer ID, pinned Ed25519 key, and exact authenticated signer endpoint.
- One to eight distinct compressed secp256k1 Bitcoin public keys.
- An explicit pairing expiry, at most thirty days after creation.

After verifying current identity, the operator proof and the preconfigured pin,
the gateway atomically consumes the pairing-approval nonce and stores a challenge.
The challenge has a random ID and nonce, owner/key hashes, full approved proposal
and at most a 120-second lifetime bounded by the operator proof.

The device independently verifies the operator proof and identity/endpoint pins.
It returns an ECDSA proof for **every listed Bitcoin key**, over a domain-separated
challenge containing the owner, proposal, fresh challenge and key. It signs the
entire challenge and ordered Bitcoin proofs with its pinned Ed25519 key.
These are custom key-possession messages; they are not Bitcoin transactions,
BIP-322 statements, blockchain attestations or hardware-presence proofs.

The gateway verifies all proofs and current ownership before activating the
pairing in one SQLite transaction. Challenges and approval nonces are single-use.
An active signer cannot be silently replaced. Revocation requires a fresh signed
owner approval and current NEOpass identity. Expired pairings may be replaced;
revoked and expired history is retained. Pairing records and revocations survive
restart. Reads are scoped to the authenticated owner and reverify the stored
operator/device/Bitcoin proofs against the current configured pins.

The `/v1/neo-vm/pair` client method uses the same explicitly configured signer
origin, service authentication, bounded JSON transport and abort signal as Gate 6.
It sends no NEOpass JWT or issuer secret. No public enrollment route is added to
the gateway. A real device companion must implement the protocol and protect its
own keys, trust configuration and durable nonce history.

## Durable outcomes

The existing SQLite WAL/FULL database now has additive signer-state tables with
their own version marker. The original approval schema and nonce history remain
compatible. New tables retain pairing approvals/challenges, pairing certificates,
revocations, signing attempts and append-only event sequences. No raw transaction,
PSBT, preimage, session token, service credential or private key enters the signing
audit metadata.

`createPairedSigningWorkflow` derives signer permissions from a verified active
pairing, then runs Gate 6's full per-call identity/operator approval and transaction
checks. It rechecks pairing and expiry at each external boundary. The durable
states are:

| State | Meaning |
| --- | --- |
| `PREPARED` | Fresh review completed and the operation was durably recorded. |
| `DISPATCHED` | Committed before the external signing call; a signature may exist. |
| `RESPONSE_VERIFIED` | Pinned device response verified; transaction hash recorded. |
| `VALIDATED` | Independent wire, Core, identity and pairing checks completed. |
| `CANCELLED` | The prepared operation stopped before dispatch. |
| `UNRESOLVED` | Dispatch occurred but the operation did not return an authorized result. |

`VALIDATED` can become `UNRESOLVED` if the final authorization recheck fails while
returning the result. Earlier validation evidence remains in the event history.
No state certifies delivery to a human or future authority to broadcast.

Every transition and its event are committed atomically. Events hash their
previous event, stage, time and bounded metadata. Audit reads verify the sequence,
hash links and summary-row consistency. This detects corruption; an administrator
who controls the complete database can rewrite it. It is not an independently
anchored or externally signed ledger.

Storage failure before dispatch prevents the device call. A failure after dispatch
keeps the approval consumed and the attempt unresolved. If a process dies before
it can write a failure, `DISPATCHED` or `RESPONSE_VERIFIED` remains visible in the
recovery query with `signatureMayExist: true`. Recovery never resends automatically.
A fresh approval and operator reconciliation are needed before another attempt.
Pairing revocation cannot undo a signature already created externally.

Gate 5's persistent local-volume, same-host SQLite, backup, stale-restore and
single-instance constraints still apply. Registration and signing share a local
transaction boundary; the live identity registry and device do not participate in
a distributed transaction. No production authority follows from a readiness report.

## Composition and inspection

Operator code uses public pins and protected configuration:

```js
const pairingAuthority = createSignerPairingAuthority({
  registry, jwtSecret, jwtIssuer, bindings, approvalStore, approvedDeviceKeys,
})
const challenge = await pairingAuthority.challenge({ token, proposal, approval })
const proof = await signerClient.requestPairingProof({ challenge, signal })
const pairing = await pairingAuthority.complete({
  token, challengeId: challenge.challengeId, ...proof,
})
const workflow = createPairedSigningWorkflow({
  pairingAuthority, approvalStore, registry, jwtSecret, jwtIssuer, bindings,
  reviewRpc, validationRpc, transportAuthenticationToken,
})
const result = await workflow.signAndValidate({
  token, pairingId: pairing.pairingId, request,
})
```

The authority also exposes signed revocation and active-pairing inspection.
Trusted operator code can use `getSigningAttempt`, `listSigningAttempts`,
`signingAudit` and `inspectSignerState` on the store. These are internal APIs;
any future HTTP/CLI facade must authenticate the caller and derive the owner hash
from verified identity, rather than accept a browser-supplied owner hash.

The lower-level Gate 6 workflow remains available for its fixture/operator use.
Pairing-required callers must use the Gate 7 wrapper. No existing public signer
endpoint has been activated by this change.

## Staging assessment

`inspectVmStagingReadiness` checks the intended workspace and commit, live deploy,
health response, regtest runtime, one instance, SQLite database inside an attached
durable mount, live identity, a verified non-fixture signer, and outcome audit.
It emits missing prerequisites and always states `authorizationGranted: false`.
The evidence snapshot is operator-provided input, not an authorization credential.

```bash
npm run neo-vm:staging -- /absolute/path/to/private-staging-evidence.json
```

Exit status 2 means prerequisites are blocked; status 1 means invalid evidence.
The command prints checks only and never echoes private infrastructure objects.
The bounded health probe performs only HTTPS `GET /healthz`, without redirects,
browser credentials or any signing request.

During this gate, the existing BVM gateway in the NEO SYSTEM workspace responded
HTTP 200 after a first timeout. Its live response states that Bitcoin RPC is not
configured and Bitcoin access is disabled. Its deployed source predates Gate 6
and its free service has no attached durable disk. The available device pilot
does not expose cryptographic signer enrollment. The live staging assessment is
therefore **BLOCKED**, separately from the tested local implementation. No paid
resource, service configuration, deployment or real-device enrollment was created.
The detailed operational report is retained privately, outside this public repo.

## Validation

```bash
npm ci --no-audit --no-fund
npm run neo-vm:test
BITCOIND_PATH=/absolute/path/to/verified/bitcoin-31.1/bin/bitcoind npm run neo-vm:pairing
npm test
npm run build
```

The VM suite passes **143 tests**, including nineteen new pairing, owner isolation,
durable-state, crash/recovery, corruption and readiness tests. The native gate
passes **89 scenarios**: 76 earlier regressions and thirteen new pairing/audit
scenarios. Pairing and signing use authenticated HTTP to a separate child process,
real Ed25519/secp256k1 fixture proofs, and separate gateway/device SQLite stores.

Native cases cover pairing, key-control failures, both replay boundaries,
redemption/refund signing, audit persistence across restart, timeout, cancellation
before dispatch, revocation during signing, Core chain change, and concurrent
calls producing one attempt and one device call. A separate crash test kills a
process after a committed dispatch and recovers the uncertain operation without
resending. No actual user device is represented by the fixture.

Evidence: [`evidence/neo-vm-gate-7.json`](evidence/neo-vm-gate-7.json). The fresh
regtest node has wallets/networking disabled, zero peers, an unchanged empty
mempool and zero application broadcasts. The repository suite passes **1,021
tests**, with one existing KI-015 Postgres integration skip without database
configuration. Build passes with its existing bundle-size warning.

The next milestone is to provision durable staging storage, configure the live
NEOpass authority and a verified real device companion, and repeat authenticated
regtest pairing/signing against the intended deployed source. Production signing
remains pending.
