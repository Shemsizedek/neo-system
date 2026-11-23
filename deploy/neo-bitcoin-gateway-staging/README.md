# NEO Bitcoin Gateway: isolated Render staging

This is a **non-transactional, no-secrets staging shell**. It proves that a
dedicated Node 24 runtime can be deployed on a separate feature branch,
without merging into `main` or redeploying NEO's production services.

- Service: `neo-bitcoin-gateway-staging`
- Source: `feat/project144-nvm-bvm-bitcoin-regtest-20261029`
- Runtime: Node 24, free-tier where eligible
- Auto-deploy: disabled
- Build: `node --test deploy/neo-bitcoin-gateway-staging/*.test.mjs server/neo-vm/*.test.mjs server/neo-platform-api/bitcoin-gateway.test.mjs && node --check deploy/neo-bitcoin-gateway-staging/server.mjs`
- Start: `node deploy/neo-bitcoin-gateway-staging/server.mjs`
- Only public result: `GET /healthz` -> health report with Bitcoin access disabled
- `/api/v1/bitcoin/chain` -> HTTP 404, even with fake operator headers
- No Bitcoin RPC host, keys, mnemonic, treasury or Counterparty credentials
- No BVM transaction creation or signing

## Verify staged service
```sh
curl -fsS https://neo-bvm-144-staging.onrender.com/healthz
curl -i https://neo-bvm-144-staging.onrender.com/api/v1/bitcoin/chain
```
Expected: HTTP 200 health with `bitcoinAccess=disabled` and HTTP 404
for the Bitcoin endpoint. Check Render deployment status before declaring
staging operational.

## Rollback
Manual-deploy an earlier good commit or suspend the isolated service.
Do not change any of the NEO services that track `main`.
Production mainnet RPC access still requires verified NEO-operated Bitcoin
Core, an authenticated authorization path, network-limited RPC, independent
security review, monitored rollback, and approved project-by-project cutover.

## Verified NEO SYSTEM Render deployment (2026-10-30)

- **Workspace:** NEO SYSTEM (`tea-dbhtkc8473hc73933img`), distinct from the earlier legacy workspace.
- **Service:** `neo-bvm-144-staging` (`srv-dbiait7f3r2c73cgkip0`).
- **URL:** https://neo-bvm-144-staging.onrender.com
- **Branch:** `feat/project144-nvm-bvm-bitcoin-regtest-20261029`.
- **Plan / region:** free / Oregon, auto-deploy **disabled**.
- **Initial deployment:** `dep-dbiaitff3r2c73cgkjag`, confirmed `live`.
- **Latest verified deployment:** `dep-dbie160473hc73c26nmg`, confirmed `live` on commit `75fc5921178a6a079265594308671779ed5f5171`.
- **Build evidence:** 37 Node tests passed, zero failed. Application log says `Bitcoin access disabled`.
- **Prior external HTTP verification:** GitHub Actions `41105586844` confirmed `/healthz` HTTP 200, Bitcoin/Counterparty/RPC/wallet HTTP 404 on the previous live release.
- **Post-deploy external HTTP verification:** use the `NEO SYSTEM live Render staging safety probe` workflow on this README update. Do not assert post-deploy HTTP success until that run passes.

Earlier, attempts to create a staging service in the **other** workspace were blocked by its service cap. That is no longer a blocker in the correct NEO SYSTEM workspace. No payments, DNS, private wallet credentials or mainnet execution were enabled.

## Shared mainnet proof boundary

The independent Bitcoin Core / Counterparty height attestation is a *private operator preflight*, not an enabled public API. See `docs/PROJECT144_MAINNET_CORE_ATTESTATION.md`. An operator-controlled Bitcoin Core RPC host is still unverified; the public Counterparty API v2 is not Core RPC. NVM/BVM Script spending remains isolated to disposable Bitcoin Core **regtest**.
