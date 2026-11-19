# NEO eGaaS — synthetic GISD custody and verification gate

Project 144 · 2026-11-07 · Source implementation only · Extends the proof-preparation foundation in PR #1346

## Outcome

An internal synthetic-only workflow now connects NEO encrypted storage to the existing eGaaS batch preparer. It tests Crown publishing capability validation and Bitcoin/Counterparty inclusion rules without handling real records, signing, creating a transaction, deploying, or changing production configuration.

**Verified locally:** three synthetic receipts encrypted, reopened and restored from an encrypted portable backup; batch preparation contains no record or nonce. Tests exercise both success and failure paths using explicitly mocked Crown, Bitcoin and Counterparty responses. These fixture successes are not live authority, a mined block, a published receipt, or blockchain inclusion.

**Live status:** Crown publishing authority and Bitcoin/Counterparty receipt inclusion remain unverified. There is no transaction ID for the synthetic batch. This gate does not create one.

## Architecture and implementation

| Component | Implementation and boundary |
| --- | --- |
| Private synthetic custody | `server/neo-platform-api/egaas-custody.mjs` accepts exactly a versioned six-field synthetic receipt. IDs must begin `SYNTHETIC-`; extra fields and real-record mode are rejected. It reuses NEO Storage Fabric AES-256-GCM, storage policy and portable export/restore. No public record-write or decrypt endpoint exists. |
| Commitment encoding | SHA-256 of UTF-8 `NEO-EGAAS-PRIVATE-RECEIPT-V1\n`, then a fresh 32-byte random nonce, then fixed-key-order UTF-8 JSON for the constrained receipt schema. JSON keys in order: `schema`, `synthetic`, `receiptId`, `learnerId`, `courseId`, `completedAt`. Nonce, record and commitment are encrypted together. The custody reference is a private storage lookup, never included in the public batch. |
| Restore integrity | Decryption authentication, storage content digest, exact receipt schema and salted commitment are checked before returning a private record. `prepare()` reopens every custody object and passes only commitments to the existing Crown-backed batch preparer. |
| Crown capability validation | `checkEgaasPublishingAuthority()` expects a trusted wrapper around existing `verifyCrownAuthorization()`, exact eGaaS service ID, proposed publishing scope, operator-pinned manifest hash and unexpired capability. No `/crown/prove` call, challenge signing, key enrollment or policy registration. Scoped service authority does not approve an individual root. `rootApprovalVerified` remains false; publishing remains disabled. |
| Bitcoin inclusion | Reuses `verifyBitcoinRpcEvidence()`, checks synchronized intended chain, active block height/hash, confirmations and `gettxoutproof`/`verifytxoutproof`. The proof's 80-byte header hash must match the requested block. Rechecks chain tip and active block after Counterparty observations; tip changes require a fresh attempt. |
| Counterparty comparison | Requires two trusted normalized readers with distinct configured node IDs, operator IDs and HTTPS origins. Both must match the approved publisher, exact batch text, transaction, valid status, network, block, Bitcoin tip and fully parsed height. Observations older than 60 seconds or over 60 seconds in the future are rejected. |

Configured operator/origin diversity does not prove physical independence. Bitcoin inclusion relies on trusted operator-configured Core RPC, while Counterparty interpretation relies on two trusted parser observations. This is not an independently implemented Bitcoin consensus or Counterparty parser. A valid Bitcoin proof alone does not establish the meaning of a Counterparty broadcast.

Each dependency call has a five-second result deadline; transport adapters must also enforce their own cancellation, body limits and connection timeouts. Read verification is performed afresh on every call, with no cached success. Results are observations at a moment in time, not permanent finality. Schedule/reconciliation wiring is not added here.

## Run and review

```sh
node scripts/egaas-synthetic-gisd-gate.mjs
node --test server/neo-platform-api/*.test.mjs server/crown-metadata/integrity.test.mjs server/neo-storage/fabric.test.mjs server/neo-prime/bitcoin-rpc-verifier.test.mjs
```

The demo uses a mode-0700 temporary parent directory and a new ephemeral runtime key. It never prints or saves the key, prints only aggregate checks and a batch root, and removes its temporary encrypted objects and backup afterward. The local backup restore is tested within the same process with the same key. This does not establish independently retained key recovery, production durability, access enforcement for multiple users, or verified replicas. Existing `EVIDENCE` policy requires three replicas; this demo does not claim that requirement is met. Do not use the temporary demo as real record custody.

Validation result: the full command above passed **111 tests, 0 failures**. The synthetic demo passed all three receipt reopen and backup checks. `git diff --check` passed.

## Trusted adapter contracts — not public API inputs

Policy is provisioned independently of an incoming request and contains `network` (`mainnet`, `testnet` or `signet`), the approved `publisher`, `manifestHash` and positive `minimumConfirmations`. No policy is enabled by default. Fixture signet configuration in tests does not select or change the production network. Production must match independently verified Counterpay configuration.

The proposed service ID is `crown:btc:app:neo-egaas`, with scope `egaas.anchor.publish`. These identifiers are requirements for a future reviewed registration, not evidence that registration exists. `verifyCapability({requiredScope})` returns the existing Crown introspector's `{ok, service_id, scopes, expires_at, manifest_hash}` response using an already provisioned protected authorization. No token is requested or handled during this gate's execution. A subsequent root-bound approval mechanism remains required before publishing.

The trusted Bitcoin adapter accepts only the RPC methods used here: `getblockchaininfo`, `getblockheader`, `getrawtransaction`, `getblockhash`, `gettxoutproof`, and `verifytxoutproof`. No signing, wallet, mining, transaction composition or broadcast method is invoked.

Each trusted Counterparty `read({txid, blockHeight})` adapter must query its own Core instance, resolve the transaction's valid broadcast and current parser state, and return:

```json
{
  "network": "<independently configured Bitcoin network>",
  "txid": "<transaction hash>",
  "blockHash": "<parsed active Bitcoin block hash>",
  "blockHeight": 0,
  "status": "valid",
  "source": "<approved publisher address>",
  "text": "NEO:eGAAS:1:<batch root>",
  "parserHeight": 0,
  "bitcoinTipHash": "<current Bitcoin tip hash>",
  "observedAt": "<fresh ISO timestamp from adapter observation>"
}
```

Heights above are schema placeholders. This is an internal normalized contract, **not an asserted raw Counterparty API response schema**. Concrete live Core readers and Bitcoin transports are not provisioned in this gate. Do not feed caller-supplied JSON or an explorer badge into these trusted callbacks. Publisher control, manifest approval and independent operator custody need separate evidence.

## Evidence and gate register

| Gate | Verified evidence | Remaining dependency |
| --- | --- | --- |
| VERIFY | PR #1346 is open and mergeable as observed. Existing encrypted storage, Crown introspector and Bitcoin RPC verifier inspected. | Maintainer review/merge of foundation. |
| CONNECT | Local synthetic custody → restored commitments → existing eGaaS Merkle batch works. | Durable restricted production custody, independent key recovery and replica restoration remain unconfigured. |
| BUILD | Internal custody adapter, capability checker, inclusion verifier and runnable synthetic demo implemented. | No new production route or privilege is enabled. |
| TEST | Synthetic custody, backup and adversarial verifier tests run locally. Exact full-suite results recorded in PR. | Positive network cases use fixtures; live equivalence is unverified. |
| DEPLOY | No deployment performed. | Staging integration follows maintainer review. |
| DOCUMENT | Encoding, trusted adapter contracts, evidence limits and blockers recorded here. | Named human owners for record policy, custody and publishing approval. |
| NEXT GATE | Prepare approved custody and read-only adapters on staging, then verify an independently supplied existing anchor transaction. | Publishing a new root is a separate transaction-authorized step, with fees and root-bound approval. |

The Render inventory identifies `neo-bvm-144-staging` in NEO SYSTEM. Its latest listed live deployment points to commit `75fc5921178a6a079265594308671779ed5f5171`. The inspected `deploy/neo-bitcoin-gateway-staging/server.mjs` at that exact commit initializes its Bitcoin handler with `enabled:false`, and `/healthz` advertises RPC not configured and mainnet false. This is verified source/configuration evidence; Render's deployment status alone is not a successful HTTP or node health check. Attempts to retrieve the public staging `/healthz` and Crown `/health` through web retrieval were inaccessible, so live endpoint health remains unknown. The earlier `/health` probes used a different path; they do not establish `/healthz` behavior.

No eGaaS publishing scope or eGaaS agent configuration was found in the inspected Crown tier-2 policy and platform production wiring. No secret values were inspected. No local `bitcoind` or `counterparty-server` executable was found. No approved live publisher, pinned eGaaS manifest, protected capability introspector, Bitcoin RPC transport or two independent live Counterparty readers is available to this workflow.

## Decisions required before live staging acceptance

| Decision | Proposed owner | Acceptance |
| --- | --- | --- |
| eGaaS Crown service and scope registration | Crown authority operators | Correct manifest pinned independently; exact publishing scope verified, with expiry/revocation checks and root-bound approval. |
| Publisher, network and confirmation policy | Crown / NEO Core operators | Publisher control verified; same verified network as Counterpay; explicit confirmation threshold. Test-only signet defaults do not migrate production. |
| Private custody recovery and access policy | GISD record custodian / NEO Storage | Separately protected runtime key, restricted storage, retention, backups and recovery tested on an independent host. |
| Parser and node provisioning | NEO Core infrastructure operators | One synchronized protected Bitcoin Core reader and two operationally independent Counterparty readers; timestamps, parser lag and reorg behavior checked against actual responses. |
| First transaction for verification | Authorized publishing operator | Independently supplied existing transaction matching synthetic batch, or separately approved fee-bearing publication. No fabricated transaction reference. |

## Primary technical references

- Existing storage implementation: `server/neo-storage/fabric.mjs` and `architecture/neo-storage-fabric-policy.json`.
- Existing Crown introspection: `server/crown-auth/verify.mjs`. This gate does not alter identity or authority policy.
- Bitcoin Core 30 `verifytxoutproof`: https://bitcoincore.org/en/doc/30.0.0/rpc/blockchain/verifytxoutproof/
- Counterparty Core API recommendation: https://docs.counterparty.io/docs/advanced/api-v2/node-api/
- Counterparty protocol: https://docs.counterparty.io/docs/advanced/protocol/
