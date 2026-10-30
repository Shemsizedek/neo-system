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
curl -fsS https://neo-bitcoin-gateway-staging.onrender.com/healthz
curl -i https://neo-bitcoin-gateway-staging.onrender.com/api/v1/bitcoin/chain
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
