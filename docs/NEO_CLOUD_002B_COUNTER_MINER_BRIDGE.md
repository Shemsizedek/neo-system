# NEO-CLOUD-002B - Counter emitter and optional local miner observation

Status: implementation candidate; parent CLOUD-002 operational acceptance remains BLOCKED.
Baseline: PR #1207, commit 4739d8bd46e8e7f0a1c289e33d09b1ac9f4922ce.
No production deployment, paid hashpower order, token issuance, wallet signature or equipment control is performed by this change.

## What changed

Counter now has a disabled-by-default server-to-server endpoint:
`POST /sandbox/cloud-miner/receipt-candidate`.

It consumes ONLY an immutable invoice provisioned locally into separate Counter sandbox tables. Existing cashier events, `/sync` state, browser success redirects and local plan drafts cannot authorize invoice creation or payment success.
The request supplies only `orderId`, `txid`, and `vout`; all identity, amount, destination, network and provider-order fields are read from the trusted invoice.
It emits the exact signed candidate expected by CLOUD-002 and records a candidate audit event, atomically. It does NOT mark a transaction paid. Generator still verifies the transaction independently through its fixed-origin testnet3 observer and durable replay ledger.

An optional CGMiner/BFGMiner client reads the documented local TCP API. It is separate from cloud providers and is NOT plugged into the production capacity allocator. No miner binary is bundled, downloaded or launched.

## Architecture and ownership

| Workstream | Component owner / accountable party | Status / dependency |
|---|---|---|
| Test invoice and emitter | NEO Counter backend; authorized Counter operator | Implemented, off by default |
| Candidate and chain verification | NEO Generator; authorized backend operator | Existing CLOUD-002 verifier, independently rechecked |
| Provider account | NEOsync-authorized provider account owner | Not authenticated in this work |
| Local hardware observation | NEO Miner edge controller; device owner | Opt-in read-only API client tested against protocol fixtures only |
| Customer rights and asset issuance | NEOsync and qualified reviewers | Unchanged; no activation or token issuance |

Only `server/neo-counter-backend/server.mjs` is changed in the existing application. The new endpoint is handled before ordinary browser session/CORS processing and uses a separate, merchant-scoped service token. It is never authorized by a cashier or ordinary Counter admin token. Default-off routing performs no new table initialization or external reads.

## Controlled sandbox configuration

Counter runtime (secret manager; never browser, APK, source or chat):
- `NEO_COUNTER_SANDBOX_ENABLED=true`
- `NEO_COUNTER_SANDBOX_EMITTER_TOKEN`: distinct random 64-character lowercase hex service token
- `NEO_COUNTER_SANDBOX_RECEIPT_SECRET`: distinct 32+ byte signing secret shared with Generator
- `NEO_COUNTER_SANDBOX_MERCHANT_ID`: exact merchant of the trusted invoice

The local provisioner additionally needs:
- `NEO_COUNTER_SANDBOX_IMPORT_APPROVED=true`
- `NEO_COUNTER_DB_PATH`: existing, absolute, owner-only Counter SQLite database
- `NEO_COUNTER_SANDBOX_ORDER_FILE`: absolute, owner-only JSON invoice

Use the CLOUD-002 canonical invoice schema. The invoice must refer to BTC_TESTNET/testnet3 and a NICEHASH_TESTNET provider order. Receiving script shape is checked; the operator must separately verify destination control. Each invoice uses its own receiving script. The file and DB must be regular, not symlinks or multiply-linked files, with 0600 permissions and current-user ownership on POSIX. Protect the parent directory from other writers and run only on the authorized durable host, not a disposable cloud instance.

```sh
node server/neo-counter-backend/cloudSandboxProvision.mjs
```

This command imports a trusted test invoice only, produces a sanitized report and never generates credentials or sends a payment. Do not use a fabricated invoice as evidence of real provider/account ownership.

The authenticated HTTPS service request carries:
```json
{"orderId":"<trusted-test-order-id>","txid":"<64-character-testnet-transaction-id>","vout":0}
```

Store the response `rawBody` byte-for-byte (no parse/reserialize) and `signature` in protected files for the existing CLOUD-002 verifier. Do not forward them to public Pages or the APK. Repeated identical requests return identical receipt bytes; conflicting bindings fail. Candidates older than five minutes require operator review instead of silently renewing evidence. Do not emit until the test transaction has the required confirmations and the verifier is ready to run. Abandoned or expired candidates need a newly reviewed invoice/destination, not manual SQL edits.

The receiver still requires NiceHash account/order authentication, trusted matching invoice, fresh signature, exact destination/amount, confirmations, canonical-block observation and durable anti-reuse state. A signed candidate alone proves none of these external facts. HMAC authenticates a shared-secret party; it is not nonrepudiable identity or blockchain consensus proof.

## Optional open-source miner observation

```js
import {createXgminerReadOnlyClient} from './server/miner-agent/adapters/xgminerReadOnly.mjs';
const client=createXgminerReadOnlyClient({enabled:true,operatorConsent:true,host:'127.0.0.1',port:4028});
const observation=await client.readTelemetry();
```

This performs read-only calls against an ALREADY running, owner-authorized miner. It does not start a miner. Hosts are literal loopback only (127.0.0.1 or ::1); a remote miner requires a separately authorized local secure tunnel. No discovery scans, arbitrary commands, DNS targets, HTTP proxy, restart, clock/voltage changes or shutdown commands are included. Report sizes and total request times are bounded.

`query()` is a private local developer API and returns raw local reports; never expose or log raw reports in a public route. `readTelemetry()` emits an allowlisted view and strips pool credentials, URLs, serials and workers. Accepted-share counts are labeled REPORTED, not independently verified. Missing power remains null; hashrate cannot be allocated to contracts. This client has not been tested with physical CGMiner/BFGMiner hardware.

## Source verification of the supplied miner list

The user's discovery identifies useful software candidates. The following are independently checked upstream findings, not inferred partnerships or free compute:

1. CGMiner: canonical original `ckolivas/cgminer`; GPLv3, not MIT. Original repository is archived (May 27, 2020). Its API accepts native JSON/text over TCP, not a generic HTTP JSON-RPC 2.0 interface. API commands and driver flags are ordinary documented capabilities, not a speed-unlocking developer mode.
   - https://github.com/ckolivas/cgminer
   - https://github.com/ckolivas/cgminer/blob/master/API-README
2. BFGMiner: canonical `luke-jr/bfgminer`; README explicitly states GPLv3. Driver compilation and API groups are documented. Broad udev rules may match non-miner devices; least privilege is preferred.
   - https://github.com/luke-jr/bfgminer
   - https://github.com/luke-jr/bfgminer/blob/bfgminer/README
3. MultiMiner: canonical `nwoolls/MultiMiner`, a graphical wrapper with Xgminer APIs; its own repository labels MIT. That does not relicense an underlying mining engine or prove a distinct developer mode.
   - https://github.com/nwoolls/MultiMiner
4. PythonBitcoinMiner redirects to HugoXOX3/PythonSHA256dMiner and describes a learning-oriented SHA-256d project. We did not run or audit its mining code, validate Android compatibility, or treat its README as evidence of pool-accepted work or earnings.
   - https://github.com/HugoXOX3/PythonSHA256dMiner

No conclusion that every linked download site is malicious is drawn. Use verified upstream source and review a pinned revision and dependencies before executing anything. Compiling source or choosing a license does not by itself prove the absence of fees. No fees or consensus protections are bypassed.

Software being free is not the same as receiving funded cloud hashpower. Local/native hashing and remote allocation remain different paths. Neither reported miner counters nor testnet successes authorize token issuance, retail sales, or mainnet capacity.

## Verification and rollback

```sh
node --test server/neo-counter-backend/cloudSandbox*.test.mjs server/miner-agent/adapters/xgminerReadOnly.test.mjs server/miner-generator/cloudSandbox.test.mjs server/miner-generator/cloudRetail.test.mjs
```

Fixtures test actual HTTP routing, exact signature bytes, immutable invoices, ledger restart, transaction rollback, cross-order reuse, request constraints, invalid chains and actual loopback TCP framing. They do not establish an authenticated provider or genuine mining/payment evidence.
The added CI workflow runs these tests without secrets; synthetic outputs are never promoted to production evidence. Existing full tests remain required. No privileged workflow is newly dispatched.

Rollback: disable `NEO_COUNTER_SANDBOX_ENABLED` and remove the optional local client configuration; then revert the candidate commit. Preserve isolated sandbox invoice/candidate/audit tables for investigation. No financial credit tables or production payout controls are modified.

## Operational acceptance still blocked

- Authorized live test-account keys and selected provider order have not been verified here.
- Real Counter invoice, receiving-script control, signed candidate and genuine testnet transfer have not been exercised here.
- Existing hosted runtime credentials, durable DB placement and TLS deployment are not attested by local fixtures.
- Local miner engine/license review, hardware ownership, pool receipts and electricity costs remain unverified.
- Published web app and Android preview are unchanged.

Next milestone: authorized operator configures the protected sandbox, imports one real test invoice, emits its signed candidate and runs CLOUD-002 against actual provider and independent transaction evidence. Remain on CLOUD-002 until that evidence passes.
