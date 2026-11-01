# NEO NVM / BVM — Gate 6

Gate 6 implements an explicitly configured external-signer request/response
protocol and independent validation of the finalized Bitcoin transaction. It
builds on Gate 5 commit `a539aa1e711b1d665469db85f17b8717334ce658`
([draft PR #1292](https://github.com/Shemsizedek/neo-system/pull/1292)).

The complete path has been tested against a separate fixture signer process and
a fresh Bitcoin Core 31.1 regtest node. No production device, live NEOpass issuer,
operator-host deployment or mainnet signing has been activated. The existing
NeoMask `/v1/signatures/request` endpoint still returns its adapter-required
response; this change adds no application HTTP route or automatic activation.

## Authorization at the signing boundary

`server/neo-vm/external-signer.mjs` exports `createExternalSigningWorkflow`.
Every `signAndValidate({token, request})` call performs Gate 5's full NEOpass
session verification, authoritative active-membership checks, operator-pinned
Ed25519 approval verification, exact PSBT/intent review and durable SQLite nonce
reservation. Caller-supplied review receipts are not accepted as authority.

The configured signer must have a pinned public Ed25519 response key, explicit
permitted operator IDs, and compressed secp256k1 public keys for the intended
contract branch. These permissions and the adapter function are captured when
the workflow is constructed. The application loads no Bitcoin private key.

The workflow checks current identity again immediately before the external call,
after the response and after final Core validation. The same identity and approval
key must remain bound, and both the session and authorization must remain valid.
The signed request expires within 30 seconds and before the original approval
expires. Inputs are copied and normalized before asynchronous work.

An approval is consumed before contacting the device. Timeout, rejection,
identity suspension, malformed response or uncertain completion leaves it
consumed. There is no automatic retry. A timeout aborts the transport; it cannot
revoke a signature that the device may already have created. Any new attempt
requires a fresh operator approval and must account for that uncertainty.

## Request and response protocol

`server/neo-vm/signer-protocol.mjs` defines canonical, domain-separated hashes
and proof challenges. Request fields are strict; unknown fields are rejected.

| Request field | Binding |
| --- | --- |
| `version`, `network` | Version 1, regtest only |
| `requestId`, `signerId` | Random 32-byte operation ID and pinned device ID |
| `issuedAt`, `expiresAt` | Integer times; lifetime at most 30 seconds |
| `program`, `intent`, `psbtBase64` | Canonical contract, approved transaction intent and exact unsigned PSBT |
| `psbtHash`, `intentHash` | Recomputed commitments matching the reviewed request |
| `neopassSubjectHash`, `approvalKeyHash` | Bound identity hash and public approval-key fingerprint |
| `approval` | Original operator Ed25519 proof, nonce and bounded approval window |

`verifySignerOperatorApproval` lets the device independently verify the operator
proof against an **independently configured public key**. A conforming device
must also pin the operator ID and subject binding, check its own clock, review
the PSBT/intent, require user presence, and atomically consume the operator nonce
in its own durable store before signing. An HTTP service credential or an
identity hash supplied in the body alone is insufficient.

The response contains exactly `version`, `network`, `requestId`, `signerId`,
`requestHash`, `expiresAt`, `userPresenceAttested`, `rawTransactionHex` and
`signatureHex`. Its Ed25519 signature binds the canonical request hash, operation,
device, expiry, presence attestation and SHA-256 of the actual returned transaction.
An old response cannot satisfy a new operation. Extra fields, including purported
private keys, are rejected.

`userPresenceAttested: true` is the pinned signer's signed assertion. It does
not independently prove a fingerprint, passkey, hardware boundary or WebAuthn
ceremony. The fixture simulates this assertion; a real paired-device adapter
and its presence implementation remain pending.

## Bounded transport

`server/neo-vm/signer-transport.mjs` exports `createExternalSignerClient`.
The operator explicitly configures an HTTPS endpoint ending in
`/v1/neo-vm/sign` and a separate 32–512 character base64url service credential.
HTTP is permitted only for loopback test/device-companion endpoints. URL
credentials, query strings, fragments and other paths are rejected.

The client sends one authenticated JSON POST, with redirects prohibited,
browser credentials omitted and caching disabled. It performs no endpoint
discovery or retry. The request body is capped at 100,000 bytes; streamed response
size is capped at 140,000 bytes regardless of advertised size. Only status 200
and JSON are accepted. The workflow timeout defaults to ten seconds and is
configurable up to thirty seconds. Transport errors do not expose credentials,
remote error bodies or raw transactions.

The outgoing body contains the bounded operator proof and pseudonymous identity
metadata; it contains no NEOpass session token, issuer secret, transport credential,
private key or preimage. A redeem-capable device must obtain its preimage locally.
The finalized redeem transaction necessarily returns that preimage in its witness;
the gateway handles it in memory without including it in its audit receipt.

## Independent final-transaction validation

`server/neo-vm/final-transaction.mjs` parses the actual returned wire bytes before
any final-validation RPC call. This parser supports only the existing one-input,
native SegWit signature/refund profile. It requires version 2, canonical bounded
counts/vectors, an empty scriptSig, the exact approved outpoint and sequence,
ordered output scripts and integer satoshi amounts, the exact branch witness,
compiled witness script, redeem preimage commitment, SIGHASH_ALL byte, locktime
and no trailing data. It independently computes txid, wtxid, size, weight and
virtual size. ECDSA validity and consensus/policy execution remain Core's job.

Using the existing five-method read-only BVM RPC profile, the validator then:

1. Requires a valid regtest chain context and mature refund height where relevant.
2. Checks the current unspent funding output, script, value, coinbase maturity,
   chain tip, approved fee and reviewed maximum signed weight.
3. Requires Core's decoded txid, wtxid, size, weight and virtual size to match the
   independent wire calculation.
4. Requires `testmempoolaccept` to accept the same txid/wtxid, with the same fee
   and virtual size. The Core fee-rate cap is explicitly 0.1 BTC/kvB; the NEO
   absolute approved fee cap remains at most 100,000 satoshis.
5. Rechecks the chain tip and funding output, then rechecks NEOpass identity and
   authorization expiry before returning.

The result contains validation status, transaction hashes, fee/weight, checked
block hash/height, operation/request commitments and identity/key hashes. It
contains no raw transaction, preimage, private key or session token and states
`broadcast: false`. No signing or broadcast RPC is allowed. Mempool acceptance
is a point-in-time policy result; it is not inclusion or settlement. Chain,
mempool and registry checks are not a distributed transaction. A later relay
would need its own fresh authorization and state checks.

## Composition

This is an operator configuration example, not a new public API:

```js
const workflow = createExternalSigningWorkflow({
  reviewRpc: createRestrictedPsbtBitcoinRpc(coreConfiguration),
  validationRpc: createRestrictedBvmBitcoinRpc(coreConfiguration),
  registry: authoritativeTempleRegistry,
  jwtSecret: provisionedNeopassSecret,
  jwtIssuer: provisionedNeopassIssuer,
  bindings: provisionedPublicApprovalBindings,
  approvalStore: durableGatewayApprovalStore,
  signer: provisionedDevicePublicKeysAndPermissions,
  adapter: createExternalSignerClient(provisionedSignerTransport),
})
const auditResult = await workflow.signAndValidate({ token: neopassSession, request })
```

The device and gateway need separate durable nonce stores. Gate 5's same-host
SQLite and backup/recovery constraints still apply to each. Provisioning real
service credentials, operator bindings, public device keys, persistent volumes,
secure pairing, outcome retention and operational recovery remains necessary
before deployment. No device enrollment or key generation endpoint is provided.

## Validation evidence

```bash
npm ci --no-audit --no-fund
npm run neo-vm:test
BITCOIND_PATH=/absolute/path/to/verified/bitcoin-31.1/bin/bitcoind npm run neo-vm:signer
npm test
npm run build
```

The VM suite has **124 passing tests**, including 24 new signing, wire-format,
transport, timeout, identity, configuration/mutation and proof tests. The native
gate has **76 passing scenarios**: 55 earlier regressions and 21 new signer/final
transaction scenarios. It uses a separate child-process HTTP signer, actual
Ed25519 and Bitcoin ECDSA fixture signatures, independently pinned operator and
device keys, and separate gateway/device SQLite databases.

The native cases include valid redemption/refund, replay at both boundaries,
wrong destination, wrong Bitcoin signer, wrong device proof, wrong preimage,
missing presence attestation, extra/oversized data, stale response, expiry,
suspension, a real funding reorg, a real chain-tip change, timeout and concurrent
requests. Device-side replay rejection also survives signer-process restart and
ephemeral response-key rotation. All Bitcoin keys are publicly known disposable
regtest fixtures; the fixture worker is not a production device service.

Evidence: [`evidence/neo-vm-gate-6.json`](evidence/neo-vm-gate-6.json). The node
is freshly spawned, wallets/networking are disabled, peers are zero, the mempool
remains empty and application broadcasts are zero. No live identity or production
signer is certified by these tests. The GitHub VM workflow runs the combined gate.

The full configured repository suite passed **1,002 tests**, with one existing
KI-015 isolated Postgres test skipped without database configuration. The build
passed with its existing bundle-size warning. The architecture audit had zero
errors and three existing gap warnings; its three tests passed. Workflow YAML
parsed successfully. The four pre-existing unrelated workflow failures in Gates
104/107/108 (missing dependency installation) and 131 (absent `riskReview` export)
remain outside this change.

The next milestone is real device pairing, durable signing-outcome audit and
verified regtest staging readiness in the NEO System Render workspace. Live
identity/storage provisioning and production activation remain pending.

Primary protocol references:

- [Bitcoin Core decoderawtransaction](https://bitcoincore.org/en/doc/31.0.0/rpc/rawtransactions/decoderawtransaction/).
- [Bitcoin Core testmempoolaccept](https://bitcoincore.org/en/doc/31.0.0/rpc/rawtransactions/testmempoolaccept/).
- [BIP 143 transaction signature context](https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki).
