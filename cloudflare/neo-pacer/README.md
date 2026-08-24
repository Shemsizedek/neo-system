# NEO-PACER MCP Runtime

NEO-PACER uses **GitHub as the primary source of truth** and a thin Cloudflare Worker only as the public HTTPS Streamable HTTP MCP runtime required for ChatGPT.

- Backend data: `data/neo-pacer/*.json` in `Shemsizedek/neo-system`
- MCP runtime: `cloudflare/neo-pacer/src/worker.mjs`
- MCP endpoint: `/mcp`
- Health endpoint: `/health`
- Frontend: GitHub Pages from `docs/neo-pacer/`

The Worker reads the public NEO-PACER registry directly from GitHub on each cache cycle. Historical records remain additive; source-of-truth changes occur in Git history.

Deployment is handled by `.github/workflows/neo-pacer-cloudflare.yml` and requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
