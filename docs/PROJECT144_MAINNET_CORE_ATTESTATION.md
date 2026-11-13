# P144 — Counterpay/Bitcoin Core mainnet verification next gate

Status: **code committed, no production Bitcoin Core RPC host verified**.

## Verified boundaries

- Render workspace: **NEO SYSTEM**, ID `tea-dbhtkc8473hc73933img` (not the other workspace named "NEO workspace").
- Live shell: `neo-bvm-144-staging`, service `srv-dbiait7f3r2c73cgkip0`. It intentionally exposes only `/healthz`; Bitcoin and Counterparty routes remain closed.
- `counterpay.holytemples.org` frontend resolves through ChatGPT Sites according to WordPress.com DNS. That DNS record **does not** reveal the backend Bitcoin Core RPC host.
- Existing NEO Counterparty reference is `https://api.counterparty.io:4000/v2/`. This is Counterparty Core API v2 on Bitcoin mainnet, **not** a Bitcoin Core JSON-RPC endpoint.
- The static Counterparty explorer in NEO SYSTEM is not an operator-owned Bitcoin node.

## New read-only attestation

`server/neo-vm/mainnet-attestation.mjs` combines:
1. Read-only `getblockchaininfo` and `getnetworkinfo` from an operator-supplied trusted **Bitcoin Core** RPC function.
2. The existing fixed Counterparty mainnet API readiness check (independent public API).
3. A fail-closed blockchain/network and height drift comparison; default maximum difference two blocks.

Outputs explicitly report **false** for shared node identity, equal block-tip hash, and Core identity verification. Height agreement is *not* independent proof of consensus, same tip, custody, validator control, or same physical machine. No signer, broadcast, transactions, token issuance or wallet methods.

## Operator preflight — when node access is established

On the Bitcoin Core host itself (or a private, authenticated operator SSH tunnel bound to local loopback), provision `BITCOIN_RPC_URL` and `BITCOIN_RPC_AUTH` in **protected runtime environment variables**, then run:

```sh
node scripts/neo-mainnet-core-attestation.mjs
```

The RPC transport rejects remote hosts, HTTPS, URL credentials, wallet paths, and arbitrary methods. Do not print the auth variable, commit credentials, or expose Bitcoin Core JSON-RPC publicly. The preflight makes only Bitcoin Core **read calls** and Counterparty's fixed public **GET** request.

If the node uses private Render connectivity, confirm the service is in the same **workspace and region**; static sites cannot receive private connections, and free web services cannot receive private-network traffic. Use Render `Connect > Internal` only for eligible receiving services. Do **not** use an external/public Bitcoin RPC endpoint as an expedient fallback.

## Acceptance blockers

- Actual NEO-operated Core node and its connection to Counterpay **not identified**.
- No attestation against the actual operator-owned Core process.
- NEOpass service identity, secure deployment secrets, audit, rollback and a dedicated protected connection must be validated before any mainnet observation endpoint is enabled.
- The BVM Script execution stack remains **regtest-only**.
- PR #1268 should not be merged into `main` without checking auto-deploy impact on unrelated Render services.

Existing Counterpay routing, wallets, payments and current Render production services must remain unchanged.
