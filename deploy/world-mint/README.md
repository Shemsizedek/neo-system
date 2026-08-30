# World Mint Genesis Pool — Host Deployment

This package turns the Nibiru Pool Core into a host-managed service. It does **not** contain Bitcoin private keys, RPC credentials, payout secrets, or fabricated mining data.

## Host assumptions

- Linux host with systemd.
- Node.js compatible with the repository engine (Node 24.x).
- Repository checked out at `/opt/neo-system` by default.
- Bitcoin Core available locally at `127.0.0.1:8332`, or through an explicitly approved private network.
- Host firewall controls access to Stratum TCP/3333.

## Install

From the checked-out repository:

```bash
sudo bash deploy/world-mint/install-host.sh
```

The installer creates a non-login `neo-world-mint` service account, persistent state directory `/var/lib/neo-world-mint`, secret file `/etc/neo/world-mint.env`, and the `world-mint.service` unit.

The generated environment file contains placeholders and is intentionally **not startable** until real values are supplied.

## Configure secrets

Edit `/etc/neo/world-mint.env` on the host. Keep it mode `0600` and owned by the service account. Configure:

- `BITCOIN_RPC_URL`
- `BITCOIN_RPC_AUTH`
- `WORLD_MINT_PAYOUT_SCRIPT_HEX`

Never paste these values into GitHub, Discord, CI logs, issue comments, or public status endpoints.

## Preflight

Run the live node check under the same environment used by the service:

```bash
sudo systemctl start world-mint.service
```

`ExecStartPre` invokes `npm run nibiru-pool:preflight`. If Bitcoin Core is unavailable, still syncing, materially behind its headers, or unable to issue a valid mining template, systemd refuses to start the pool daemon.

For manual troubleshooting, load the environment in a protected root/service shell and run:

```bash
npm run nibiru-pool:preflight
```

## Exposure policy

The example binds Stratum to `127.0.0.1`. Change `NIBIRU_STRATUM_HOST=0.0.0.0` only after the host firewall/security group explicitly permits the intended miner source addresses. Keep `NIBIRU_HEALTH_HOST=127.0.0.1`.

Bitcoin Core RPC should remain local. If remote RPC is unavoidable, use a private authenticated network/VPN and explicitly set `ALLOW_REMOTE_BITCOIN_RPC=true`.

## First worker

Provision the worker credential locally:

```bash
cd /opt/neo-system
set -a; source /etc/neo/world-mint.env; set +a
npm run nibiru-pool:worker -- --worker=world-mint-01 --member=world-mint
```

The secret is shown once. Store it directly in the miner configuration or an approved secret manager; the database retains only the credential verifier.

Before attaching real hashpower, run the safe connectivity smoke test. It subscribes and authorizes but never calls `mining.submit`:

```bash
npm run nibiru-pool:smoke -- --worker=world-mint-01 --secret='<one-time-secret>'
```

## Service operations

```bash
sudo systemctl start world-mint.service
sudo systemctl status world-mint.service
sudo journalctl -u world-mint.service -f
sudo systemctl stop world-mint.service
```

Local health checks:

```bash
curl -fsS http://127.0.0.1:3334/healthz
curl -fsS http://127.0.0.1:3334/readyz
curl -fsS http://127.0.0.1:3334/status
```

## Accounting invariant

Connectivity, authorization, hash-rate claims, ordinary accepted shares, and submitted block candidates are **not BTC production**. Only a block confirmed by Bitcoin Core is eligible to become bookable mining production in NEO Books.
