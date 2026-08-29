# NEO Miner Operator Control Plane Deployment

## Security topology

Use two Node services on one private container network:

- `miner-production:8890` — private only. No public port. Holds HashVault, payout, PSBT, recovery, and Bitcoin Core integration.
- `miner-operator:8891` — public only through the TLS edge/tunnel. Holds operator login/session/RBAC/CSRF and proxies authorized actions to the private API.
- Cloudflare Tunnel or another TLS reverse proxy exposes only `miner-operator:8891`.

The preferred browser and BFF hosts must be separate HTTPS origins under the same private site suffix, for example:

- Console: `https://console.neo.example.com`
- Operator BFF: `https://operator.neo.example.com`
- Site suffix: `neo.example.com`

With that topology, set `NEO_OPERATOR_COOKIE_SAMESITE=Lax` and `NEO_OPERATOR_REQUIRE_SAME_SITE=true`. The operator service refuses to start if the public origins are HTTP, outside the configured site suffix, use insecure cookies, or use `SameSite=None` while same-site mode is required.

## GitHub-native runtime images

`.github/workflows/miner-runtime-images.yml` publishes:

- `ghcr.io/shemsizedek/neo-system-miner-production:main`
- `ghcr.io/shemsizedek/neo-system-miner-operator:main`

Every build also receives an immutable commit-SHA tag. The Docker build emits provenance and SBOM metadata.

## Runtime configuration

Start from `config.example.env`, but keep all real values in the runtime secret manager. Required secret material includes:

- `NEO_MINER_API_TOKEN`
- `NEO_OPERATOR_SESSION_SECRET`
- `NEO_OPERATOR_ACCOUNTS_JSON` containing only scrypt password hashes
- Bitcoin Core RPC credentials when live Bitcoin is enabled
- external payment/provider secrets as applicable
- `CLOUDFLARE_TUNNEL_TOKEN` when the compose Tunnel sidecar is used

Generate operator password hashes with:

```bash
npm run miner:operator:hash -- "long operator passphrase"
```

Never place plaintext passwords, API bearer tokens, Bitcoin RPC credentials, signer keys, seed phrases, or tunnel tokens in GitHub Pages variables.

## Container deployment

Copy `docker-compose.production.example.yml` to the runtime host, create `config.production.env` from the example with real secrets supplied by the host secret manager, then bring up the services. The production API is reachable only as `http://miner-production:8890` from the private container network. The operator BFF is reachable as `http://miner-operator:8891` from the tunnel.

A persistent volume backs `/var/lib/neo-miner`; losing that volume means losing restart-safe SQLite state and does not satisfy the production gate.

## Cloudflare edge

Configure the Cloudflare Tunnel public hostname to route the operator hostname to:

`http://miner-operator:8891`

Do not create a public hostname for `miner-production:8890`.

The BFF honors `CF-Connecting-IP` for login-rate-limit identity when present, but it still enforces exact browser `Origin`, session RBAC, and CSRF independently of Cloudflare.

## Pages build variable

The browser bundle needs only the public BFF address:

`NEO_MINER_OPERATOR_API=https://operator.neo.example.com`

Expose that repository variable to Vite as `VITE_NEO_MINER_OPERATOR_API`. No token belongs in the Pages build.

## Deployment smoke test

After the DNS/TLS/tunnel runtime is live, run the GitHub workflow **NEO Miner Operator Deployment Smoke**. Configure repository variables:

- `NEO_MINER_OPERATOR_API`
- `NEO_MINER_OPERATOR_ORIGIN`

Optional authenticated smoke credentials belong only in GitHub Actions secrets:

- `NEO_SMOKE_OPERATOR_ID`
- `NEO_SMOKE_OPERATOR_PASSWORD`

The smoke harness checks HTTPS, exact CORS origin, `/health`, `/ready`, anonymous-session blocking, secure SameSite session cookie policy, an authenticated treasury read, permitted/denied audit access according to role, and logout. It never prints the password, cookie, or CSRF token.
