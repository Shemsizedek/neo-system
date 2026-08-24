# NEO Miner Controller v0.7

NEO Miner Controller is the appliance layer that supervises the NEO Miner Agent beside physical SHA-256 miners.

## Responsibilities

- Start and supervise the Miner Agent.
- Expose a localhost-only health/status API by default.
- Run local ASIC discovery when explicitly enabled.
- Keep hardware control opt-in through the Miner Agent `allowControl` setting.
- Provision Ed25519 device identity keys with restrictive file permissions.
- Validate OTA manifests with Ed25519 signatures, HTTPS artifact URLs, and SHA-256 artifact hashes.
- Run under a hardened systemd unit on Linux edge controllers.

## Recommended deployment

Use Debian/Ubuntu Server, Raspberry Pi OS Lite, or a minimal industrial Linux distribution on ARM64/x86_64. Create a dedicated `neo-miner` system user. Install the repository under `/opt/neo-system`; keep controller configuration under `/etc/neo-miner-controller` and agent configuration under `/etc/neo-miner-agent`.

Do not store Bitcoin private keys, seed phrases, pool passwords, or payment credentials in the web dashboard. Device signing keys should remain on the appliance and should eventually move into TPM/secure-element backed storage on NEO hardware.

## Local endpoints

- `GET /health` — controller liveness.
- `GET /status` — appliance/agent/discovery snapshot.
- `POST /discover` — local subnet discovery only when `allowLocalDiscovery` is enabled.

The default listener is `127.0.0.1:8787`; do not expose this API directly to the public internet.

## Service

Copy `systemd/neo-miner-controller.service` to `/etc/systemd/system/`, adjust the Node path/working directory if required, then enable the service with systemd. The unit uses `Restart=always`, `NoNewPrivileges`, a read-only system view, and limited writable directories.

## OTA

OTA installation is disabled by default. An update candidate must pass all of these gates before staging:

1. Manifest has a newer version, HTTPS artifact URL, and valid SHA-256 digest.
2. Manifest signature verifies against the configured NEO update-signing public key.
3. Downloaded artifact SHA-256 exactly matches the signed manifest.
4. Installation/activation remains a separate privileged step so staging cannot silently replace the running controller.

## Hardware roadmap

This appliance is the software reference for a future NEO Miner control board. The long-term target is secure boot, TPM/secure element identity, redundant watchdogs, Ethernet, optional Wi-Fi for provisioning, fan/power/sensor buses, and signed A/B firmware/OS updates.
