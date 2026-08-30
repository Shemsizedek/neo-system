# NEO OCI Always Free Backend

This directory defines the Oracle Cloud Infrastructure (OCI) deployment target for always-on NEO backend services while GitHub Pages remains the primary public frontend.

## Why OCI

OCI Always Free provides persistent compute instead of sleep-on-idle web services. It is not unlimited: Always Free usage has resource ceilings and regional capacity constraints. The intended NEO baseline is an Ampere A1 VM sized within the Always Free allowance.

## Architecture

GitHub Pages -> HTTPS reverse proxy -> OCI VM -> Docker Compose -> NEO Platform API -> registered NEO services

The first VM acts as the shared backend gateway for the entire NEO System rather than attempting to run every service as an independent public container. `neo-system-services.json` is the canonical OCI service map. The read-only gateway exposes it at `/api/v1/oci/services`.

Registered domains include NEO Prime, NEO Router, NEOpay, NEO Counter, NEO Teller, NEO Exchange, NEOscan, Noogle, Noogle Finance, NEO Relations, GISD / NEO Cipher, NEO Tokenworks, Nibiru Reserve, NEO Miner, NEO Generator, NEO Enterprise, NEO Evidence, NEO Bots, Discord bridge, NEO Telegram, NEO TV, NEO Guardian, NEO VPN, NEO Pads, NEO GAS, NEO Hub, NEO Lingo, NEO Algo, and NEO Corpus.

Registration does not imply that privileged runtime execution is enabled. Each service carries an exposure mode such as public-read-only, authenticated-only, operator-only, or infrastructure-only.

## Runtime endpoints

- `/health` — gateway health plus registered OCI service count
- `/api/v1/platforms` — existing public platform capability registry
- `/api/v1/oci/services` — full OCI NEO System service registry
- `/api/v1/prime/markets` — read-only market snapshot
- `/api/v1/prime/assets/:asset` — read-only asset view

## Security boundary

Keep privileged signing, wallet secrets, seed phrases, private keys, API credentials, and production financial execution outside public GitHub Pages and outside repository files.

The OCI gateway defaults to read-only/public information. Authenticated services can be attached behind the gateway later without making them anonymous public endpoints. Payment, trading, treasury, wallet, mining-control, bot-control, and signing actions remain disabled until their individual authentication, authorization, approval, audit, and signing boundaries are satisfied.

## Required OCI values

Configure these in OCI/GitHub environments, never commit real values:
- OCI_TENANCY_OCID
- OCI_USER_OCID
- OCI_FINGERPRINT
- OCI_REGION
- OCI_COMPARTMENT_OCID
- OCI_SUBNET_OCID
- OCI_SSH_PUBLIC_KEY

For automated GitHub deployment, prefer an OCI-compatible short-lived/federated identity mechanism when available. If API-key authentication is used, store the private key only in GitHub Actions secrets and scope the OCI policy to the minimum required resources.

## VM baseline

Target: VM.Standard.A1.Flex
- 2 OCPUs
- 12 GB RAM
- Ubuntu 24.04 or Oracle Linux 9
- boot volume inside Always Free storage limits

Do not silently resize above the Always Free allocation.

## Bootstrap

1. Create the OCI VCN/subnet and Always Free compute instance.
2. Attach a reserved public IP if available within the account limits.
3. Open only 22/tcp for administration and 80/443 for the reverse proxy. Restrict SSH by source CIDR where practical.
4. Run `infra/oci/bootstrap-host.sh` on the VM.
5. Copy `.env.example` to `.env` on the host and provide runtime-only values there.
6. Run `docker compose -f infra/oci/docker-compose.yml up -d --build` from the repository checkout.
7. Point the NEO runtime hostname at the OCI public IP and enable HTTPS before exposing API traffic.
8. Verify `/health` and `/api/v1/oci/services` before connecting consumer applications.

## Production boundary

This foundation is safe for public/read-only APIs and authenticated application runtimes. Consequential payment, trading, wallet, treasury, mining-control, bot-control, or signing actions require separate approval, authentication, audit logging, and non-custodial signing gates before production enablement.
