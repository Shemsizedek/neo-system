# NEO-CLOUD-002 - One-command sandbox acceptance

Status: operator tooling implemented; external acceptance remains BLOCKED.
Extends the existing PR #1208 on PR #1207. This is not CLOUD-003 and not a production release.

## Outcome

The earlier handoff required an operator to copy the exact Counter receipt bytes and signature into files. This runner joins that handoff without putting either in chat, browser storage, APK assets or source control:

1. Local preflight validates configuration, protected invoice/reference files, endpoint origin and isolated ledger.
2. With explicit approval, NiceHash testnet account/order and statistics are read first.
3. Only after successful provider authentication, a single POST requests a signed candidate from the existing Counter sandbox emitter.
4. Candidate signature, invoice, amount, customer, merchant, provider order and requested transaction output are checked.
5. The existing fixed-origin testnet3 observer independently checks transaction destination, amount, confirmations and block membership.
6. The existing persistent sandbox ledger rejects duplicate output/order attribution. Retries recheck the observer; past success never suppresses a reorganization failure.

Only sanitized status is printed. No hashpower order is purchased, no invoice is automatically provisioned, no payment is broadcast, no contract is activated, and no token is minted.

## Run it

From the reviewed PR checkout on the authorized persistent host:

```sh
# Default is a local, non-network preflight. Exit 2 means BLOCKED.
node server/miner-generator/cloudSandboxAcceptance.mjs --preflight

# Only after the operator has approved the sandbox configuration:
node server/miner-generator/cloudSandboxAcceptance.mjs --run
```

The second command also requires `NEO_CLOUD_SANDBOX_ACCEPTANCE_APPROVED=true`. This records operator intent in configuration; it is not a substitute for host access controls. Do not run with shell tracing. Keep output within authorized operational records.

## Required protected configuration

Continue using the existing protected NiceHash and Counter credentials; do not make new accounts, purchase capacity or generate replacement provider keys automatically.

| Configuration | Meaning |
|---|---|
| `NEO_CLOUD_SANDBOX_ENABLED=true` | Explicit sandbox opt-in |
| `NICEHASH_TEST_API_KEY` / `NICEHASH_TEST_API_SECRET` / `NICEHASH_TEST_ORGANIZATION_ID` | Authorized read-only provider account; testnet only |
| `NICEHASH_TEST_ORDER_ID` | Existing selected SHA-256 order UUID |
| `NEO_COUNTER_SANDBOX_EMITTER_URL` | Exact `/sandbox/cloud-miner/receipt-candidate` URL |
| `NEO_COUNTER_SANDBOX_ALLOWED_ORIGIN` | Separately approved exact origin, no path or trailing slash |
| `NEO_COUNTER_SANDBOX_EMITTER_TOKEN` | Dedicated 64-character lowercase hex service token |
| `NEO_COUNTER_SANDBOX_RECEIPT_SECRET` | Separate 32-1024-byte Counter signer secret |
| `NEO_COUNTER_SANDBOX_MERCHANT_ID` | Merchant of the trusted invoice |
| `NEO_COUNTER_SANDBOX_ORDER_FILE` | Absolute path to the already approved immutable invoice |
| `NEO_COUNTER_SANDBOX_TRANSACTION_FILE` | Absolute path to a private JSON object containing only `txid` and `vout` for an already made test transfer |
| `NEO_CLOUD_SANDBOX_LEDGER_PATH` | Absolute path ending in `sandbox-evidence.sqlite`, in its own private sandbox state directory |
| `NEO_CLOUD_SANDBOX_ACCEPTANCE_APPROVED=true` | Required for `--run`, not for preflight |

Counter must already be configured and its test invoice imported using the reviewed `cloudSandboxProvision.mjs` path from PR #1208. Browser drafts or manually forged paid events are not invoices. The runner does not create an invoice or send test coins.

URLs must be HTTPS, except literal loopback `127.0.0.1` or `::1` for a local Counter instance. No username/password, query string, fragment, redirect, alternate path, hostname alias or normalized numeric loopback disguise is accepted. The full URL origin must match the approved origin. Remote TLS termination and access restrictions are separately operator-verified, not inferred from a configured URL.

Input files must be regular, single-link, current-user-owned and mode 0600 or stricter, at most 16 KiB. Their immediate parent directories must be current-user-owned and mode 0700 or stricter. Symlink parents and symlink/hardlink leaves are refused. The runner does not repair permissions automatically.

The evidence ledger must be distinct from both inputs and Counter's database. Existing databases containing unrelated tables are rejected. SQLite sidecars are checked before use. The directory must already exist; preflight never creates it or modifies a schema. A private persistent local file does NOT prove that a cloud volume survives instance replacement. The operator must independently validate volume durability and backup/restore.

Use a dedicated service identity and a private filesystem namespace. Same-UID or root compromise can still change files between checks; this is not an operating-system sandbox against privileged attackers. HMAC authenticates shared-secret holders, not legal identity or destination ownership. The chain observer remains a third-party trust dependency, not a full-node/SPV proof.

## Machine-readable outcomes

- `CONFIGURED_NOT_AUTHENTICATED`: local input checks passed, with no network requests and `gatePassed:false`.
- `BLOCKED`: missing/unsafe configuration, no operator approval, provider failure, candidate failure or independent observation failure.
- `SANDBOX_INTEGRATION_VERIFIED`: genuine CLI execution obtained account/order reads and independently observed the matching testnet3 payment with persistent replay protection. Still not mainnet mining, payout proof, resale permission or token backing.
- `FIXTURE_INTEGRATION_PASSED_NOT_EXTERNAL_PROOF`: automated injected-transport/clock run worked. Always `gatePassed:false` and `externalEvidenceVerified:false`.

Exit 0 from `--preflight` means only that configuration passes local checks. Exit 0 from `--run` requires the real sandbox integration result; fixture results cannot return this CLI success. Reports never include keys, signatures, transaction identifiers, customer IDs, order IDs, scripts, filesystem paths or upstream response bodies.

## Test evidence

```sh
node --test server/miner-generator/cloudSandboxAcceptance.test.mjs
node --test server/neo-counter-backend/cloudSandbox*.test.mjs \
  server/miner-agent/adapters/xgminerReadOnly.test.mjs \
  server/miner-generator/cloudSandbox.test.mjs \
  server/miner-generator/cloudRetail.test.mjs \
  server/miner-generator/cloudSandboxAcceptance.test.mjs
```

The new suite uses three actual loopback HTTP services: a signed-request-checking NiceHash fixture, the actual Counter handler and issuer, and a separate chain-observer fixture. All identities, transactions, account replies and confirmations are synthetic. It also checks restart/retry behavior, reorganization rejection, missing approvals, URL rejection, file permissions, protected directories, symlink/hardlink rejection, database isolation and output redaction.

## Project register and decision log

| Item | Accountable owner | Evidence / state |
|---|---|---|
| CLOUD-001 web/APK | NEOsync release owner | Previously published; unchanged by this candidate |
| CLOUD-002 provider and verifier | Authorized provider/backend operator | PR #1207, external authentication still pending |
| CLOUD-002B receipt emitter | Authorized Counter merchant operator | PR #1208, default off |
| Acceptance runner | NEO Generator implementation | Local integration tests; no runtime configured automatically |
| Connected host | Authorized host operator | Enrolled SentinelX host reported offline during this session; no credential-read or deployment succeeded |
| Genuine invoice/transaction | Authorized Counter operator | Not supplied or generated here |
| Mainnet contracts/tokens | Separate commercial/compliance review | Disabled |

Decision: extend the existing draft rather than create another gate or another hosting service. Failure to reach the authorized host is a deployment blocker, not evidence that its secrets are missing. No cloud instance, subscription, tunnel, mining process, external account or financial product is created.

Next milestone: restore authorized host access, check credential presence without printing values, review the private configuration and trusted invoice, and execute the runner against genuine provider/order/payment evidence. Do not declare CLOUD-002 complete based on fixture tests.

Rollback: do not run the new CLI, keep the original sandbox flags disabled, and revert its additive files if needed. Existing private services, Pages, APK, financial tables and approval settings remain untouched. Preserve evidence records; do not erase them as part of rollback.

## Implementation references

- Existing contracts: `docs/NEO_CLOUD_002_SANDBOX.md`, `docs/NEO_CLOUD_002B_COUNTER_MINER_BRIDGE.md`.
- Node file descriptor flags and file-stat APIs: https://nodejs.org/docs/latest-v24.x/api/fs.html
- Existing provider client: `server/miner-generator/nicehashReadOnly.mjs`.
- Existing testnet verifier and ledger: `server/miner-generator/cloudSandbox.mjs`.
