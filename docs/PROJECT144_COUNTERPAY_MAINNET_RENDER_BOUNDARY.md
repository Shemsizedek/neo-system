# Project 144 - Counterpay mainnet and NEO SYSTEM Render boundary

Verified on 2026-10-29 through the connected Render, WordPress.com and GitHub tools.

## Correct Render workspace

- **NEO SYSTEM** workspace ID: `tea-dbhtkc8473hc73933img`.
- Distinct legacy **NEO workspace**: `tea-db8bbpij9qps73cb7gb0`. Do not substitute it for the user-designated deployment target.
- **NEO SYSTEM** currently contains `neo-bitcoin-counterparty-explorer` (static site, branch `feature/p144-counterparty-mainnet-readiness`), `neo-modern-treasury-staging` and `neo-ces-read-staging`.
- The Counterparty explorer's last examined Render deploy was `live`. It is a **static site**, not a Bitcoin Core node or wallet service.
- Use workspace ID explicitly for any subsequent Render connector operation. No implicit session workspace selection.

## Counterpay website routing

- WordPress.com manages DNS for active `holytemples.org` and reports WordPress name servers in use.
- `counterpay.holytemples.org` is a **CNAME** to `custom-domains.chatgpt.site`, with the related domain verification TXT records.
- **Do not repoint DNS** to Render or Bitcoin RPC. The frontend hostname alone does not prove which Bitcoin Core backend is in use.

## Bitcoin mainnet data sources

- In this repository, `src/explorer/counterpartyHealthAdapter.ts` uses `https://api.counterparty.io:4000/v2/`, validates that the network is `mainnet`, and reports synchronization health.
- `api/neo-exchange/server.mjs` uses `COUNTERPARTY_API_BASE` with default `https://api.counterparty.io:4000`.
- This is a **Counterparty API**, not the Bitcoin Core JSON-RPC endpoint. There is no verified matching operator-owned Core RPC endpoint available from the frontend/DNS evidence.
- NVM/BVM must be aligned to the **same Bitcoin mainnet chain** at the observation layer, without assuming it is the same private node. Bitcoin mainnet observation should not be confused with regtest-only Script execution.
- For Bitcoin Core node reuse, explicitly verify operator-owned Core node's `getblockchaininfo.chain == 'main'` via authenticated private RPC. Do not copy or expose keys.

## Authorization and staging

- Current `server/neo-vm/` Script execution/verification implementation stays **regtest-only**, non-custodial and without signing or broadcast.
- `server/neo-platform-api/bitcoin-gateway.mjs` is a feature-flagged, read-only mainnet chain observation service requiring NEOpass operator and project allowlist.
- The `deploy/neo-bitcoin-gateway-staging/` public shell stays Bitcoin-disabled until isolated runtime, identity and RPC security are validated.
- Never connect a public Render static site to a sensitive Bitcoin Core RPC listener. Use properly protected backend connections and explicit authorization.
- Do not merge this PR to `main` just to trigger deployment: prior verification showed seven unrelated auto-deploy services on the **other** workspace.
- No DNS change, mainnet transaction, key access, wallet behavior, payment routing change, or Render deploy was made during this gate.

## Next acceptance

1. Inspect Counterpay Sites frontend's actual runtime API configuration and verify Counterparty readiness over the expected mainnet source.
2. Locate operator-owned Core process and backend, if any, through authorized inventory without exposing credentials.
3. Design a private mainnet **observation-only** connector within NEO SYSTEM, with tested service identity, same-region requirements and no public Core RPC.
4. Provision isolated runtime capacity only after confirming plan and project placement; verify live deploy and rollback before claiming deployed status.
