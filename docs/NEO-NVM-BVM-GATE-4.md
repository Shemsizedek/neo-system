# NEO NVM / BVM — signature, refund and PSBT review gate

Project 144 · NEO-VM-G4 · October 29, 2026

This gate adds a public-key-only Bitcoin contract compiler and a read-only
PSBT authorization reviewer. Native Bitcoin Core regtest validates real
ECDSA signatures, the two contract branches, block-height locks and PSBT
metadata. Operator approval uses a separate signed, expiring, one-use review
envelope. There is no live NEOpass or wallet integration in this gate.

## Contract

`core/neo-nvm/signature-refund.mjs` accepts this exact format:

```js
{
  schemaVersion: 1, family: 'bitcoin', network: 'regtest',
  kind: 'sha256-signature-refund-v1',
  digestHex: '<32-byte SHA256 digest in hex>',
  redeemPublicKeyHex: '<33-byte compressed secp256k1 public key>',
  refundPublicKeyHex: '<different compressed secp256k1 public key>',
  refundHeight: 207,
}
```

The compiler checks both public keys are valid curve points, normalizes hex,
rejects unknown fields and networks, and accepts block heights from 1 through
499,999,999. Timestamp locks and identical branch keys are outside this profile.

```text
IF
  SIZE <32> EQUALVERIFY SHA256 <digest> EQUALVERIFY <redeemKey> CHECKSIG
ELSE
  <refundHeight> CHECKLOCKTIMEVERIFY DROP <refundKey> CHECKSIG
ENDIF
```

The result is a native P2WSH witnessScript and scriptPubKey. A redeem witness
is `[signature, preimage, 01, witnessScript]`; a refund witness is
`[signature, empty, witnessScript]`. Both paths require a real ECDSA signature.
The refund additionally requires a compatible transaction locktime and
nonfinal sequence. The redeem path remains available after the refund height;
the timeout does not disable it. Future product workflows must account for
that possible competition between spends.

The existing bounded local evaluator rejects unsupported IF, CHECKSIG and
CLTV opcodes. It does not pretend to verify this contract; Bitcoin Core is
the execution authority for this profile.

## PSBT review authorization

`authorizePsbtReview(request, trustedConfiguration)` in
`server/neo-vm/psbt-authorization.mjs` reviews unsigned PSBT v0 for one native
P2WSH input. The trusted configuration must supply a public Ed25519 approval
key, its operator ID, a Core RPC client and an atomic one-use approval store.
It accepts no request-supplied approval boolean or signing key.

The exact intent fields are:

| Field | Required policy |
| --- | --- |
| schemaVersion / network | `1` / `regtest` |
| programId | Compiled witnessScript hash |
| branch | `redeem` or `refund` |
| outpoint | Exact txid and output index |
| outputs | Ordered native witness scriptPubKeys and decimal integer satoshis |
| maxFeeSats | Integer string from 1 to 100000 |
| transactionVersion | 2 |
| lockTime | 0 for redemption; exact refund height for refund |
| sequence | `0xfffffffd` |

The signed review envelope contains version, operator ID, a 32-byte nonce,
issuedAt, expiresAt, the PSBT-byte hash and a separate normalized intent hash.
`psbtReviewCommitments` and `psbtApprovalChallenge` produce domain-separated
commitments and challenge bytes. The approval window is at most five minutes.
The configured public key verifies the signature before any RPC call.

Core independently decodes the PSBT and supplies the real unspent output.
Review requires exact inputs/outputs, matching witnessScript and witness UTXO,
SIGHASH_ALL, no existing signatures or finalized witness, bounded weight,
positive fees within the reviewed cap, and no unreviewed metadata. When a
full previous transaction is supplied, its txid/output must also match.
The single-input restriction avoids relying on attacker-supplied amounts
for other inputs. Refund reviews require the Core tip to reach refundHeight;
this profile deliberately declines early presigning of refunds.

The separate PSBT RPC profile permits only getblockchaininfo, decodepsbt and
gettxout. The existing five-method BVM profile remains unchanged.

Authenticated values are copied before awaiting RPC results. Caller mutation
cannot replace the reviewed PSBT, extend the signed expiry or change the
consumed nonce. Freshness is checked again before and after atomic nonce
reservation. If approval expires during reservation, the request fails and
the reservation stays consumed. Concurrent replays cannot both succeed.

The receipt says `REVIEW_APPROVED`, includes the exact hashes, and reports
`bitcoinSignatureCreated:false` and `broadcast:false`. This is a verified
review decision, not a signed Bitcoin transaction, a generic bearer signing
capability, or a guarantee of final mempool acceptance. An eventual signer
must revalidate the current transaction and chain state before signing.

## Run and evidence

```bash
npm run neo-vm:test
BITCOIND_PATH=/absolute/path/to/verified/bitcoin-31.1/bin/bitcoind npm run neo-vm:signatures
```

The native harness reuses the Gate 3-owned regtest node and cleanup logic.
It executes the 13 earlier Core regression scenarios, then 15 signature/refund
scenarios and 14 PSBT authorization scenarios. The node has a fresh data
directory, networking disabled, wallets disabled and no peers. Its mempool
remains unchanged. All ECDSA signing is confined to test support using public
disposable keys 1, 2 and 3; the application exports no Bitcoin signer.

The test approval key is ephemeral. The test nonce store is a temporary
atomic Set; it is not presented as a durable production store.
Machine-readable native evidence is in
[`evidence/neo-vm-gate-4.json`](evidence/neo-vm-gate-4.json). CI downloads the
same pinned Bitcoin Core archive, verifies its checksum and reruns all native
gates. Unit tests need only Node.js 24 built-ins.

## Local verification record

- VM unit suite: 78 passed, zero failures or skips.
- Native gate: 15 signature/refund cases, 14 PSBT authorization cases and
  all 13 earlier Core regression cases passed.
- Full configured repository suite: 956 passed, zero failures, one existing
  isolated Postgres integration test skipped; 957 total.
- Repository build passed with the existing frontend bundle-size warning.
- Architecture registry tests: three passed. Audit: zero errors and three
  existing gap warnings. Workflow YAML parsed successfully.

## Remaining integration work

- Map verified NEOpass principals and authorized roles to the review authority;
  the fixture operator ID is not a live user identity.
- Back nonce reservations with a durable atomic store and test restart/recovery.
- Connect a separately reviewed external PSBT signer and recheck final signed
  transactions, signature flags, current UTXOs, fees and approval state.
- Review refund races, RBF/mempool conflicts, recovery procedures and signer
  key custody before an operator-host staging deployment.

The scoped register is
[`architecture/neo-virtual-machines.json`](../architecture/neo-virtual-machines.json).
Live wallet, NEOpass, NeoMask, NEO Counter and Counterparty/NOMNI behavior is
not changed by these prototype modules. Production deployment is pending.

## Primary references

- [BIP 65: CHECKLOCKTIMEVERIFY](https://github.com/bitcoin/bips/blob/master/bip-0065.mediawiki)
- [BIP 143: witness-v0 signature hashing](https://github.com/bitcoin/bips/blob/master/bip-0143.mediawiki)
- [BIP 174: PSBT format and signer checks](https://github.com/bitcoin/bips/blob/master/bip-0174.mediawiki)
- [Bitcoin Core 31 decodepsbt](https://bitcoincore.org/en/doc/31.0.0/rpc/rawtransactions/decodepsbt/)
