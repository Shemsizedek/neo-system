# NEO Angel — first implementation gate

NEOsync's project identity follows the supplied Temple teaching, “An angel is a thought of God Allah.” NEO Angel is the NEO background-service name; `N` is a project naming convention. Standard operating-system services retain their existing names.

The broader NEO Angel purpose, 999 identity, verified host discovery and first-host acceptance requirements are recorded in [GATE-2.md](GATE-2.md). NEO Angel's intended scope extends beyond security; this package implements only its first observation adapter.

This is a proposed companion to NEO Guardian, not a replacement for its Android Work Shield, the NEO Hacker analysis engine, NEO Router, NEOpass or the governance security directive. It performs authorized observations only. A changed file is an anomaly, not proof of malware. It is not a full antivirus scanner, a claim of immunity, or a claim of internet-wide installation.

## Implemented

- Node 22+ supervisor-compatible foreground process, independently detached by systemd after an authorized administrator enables its unit. The process needs no browser or interactive terminal while the service runs.
- Explicit local enrollment; the sample refuses to run until the owner sets `authorized: true` and supplies a real device ID. That local setting is an operator declaration, not independent identity attestation.
- Sequential, bounded HTTPS GET checks of selected NEO endpoints. No redirects, supplied URLs, credentials, remote commands, crawling, exploitation, self-installation or propagation.
- SHA-256 comparisons for only the enrolled `angelN.mjs` and `core.mjs` program files in the installation directory. Baselines must be computed from reviewed trusted bytes; the service never auto-learns a potentially compromised baseline. Empty baselines are explicitly unconfigured.
- No symlink/device-file inspection, personal-file traversal, secret collection, telemetry upload, inference, quarantine, deletion, payment or deployment.
- Minimal JSON observations to the local journal and an atomically replaced mode-0600 `latest.json`. The file is an observation, not a signed attestation. Set host log retention before production.
- Config re-read each cycle; `enabled: false` pauses new checks, and withdrawn enrollment fails closed. SIGTERM/SIGINT cancels network work and exits. For immediate stop use systemctl stop; no background process is hidden from its operator.

The background process is not active simply because this code or its PR exists. A browser tab and a free hosting cold-start service are not proof of continuous uptime.

## Validate

```
node --test services/neo-angelN/core.test.mjs
```

No extra dependency, scanner signature subscription or model API key is required for this implementation. Hosting and organizational operations can still have costs; donor funding is separate and no financial authority is created here.

## Enroll one Linux host after maintainer review

Use an already authorized persistent host with Node 22+ and systemd. No installer downloads or enables anything automatically.

1. Review/merge the PR through the repository process. Inspect the two program files and pin their reviewed SHA-256 digests.
2. As the host administrator, copy `angelN.mjs` and `core.mjs` into root-owned `/opt/neo-angelN`, with files mode 0644 and directory mode 0755. Put the reviewed sample at `/etc/neo-angelN/config.json` (root-owned, readable by the dynamic service user; this file contains no secrets).
3. Set a real device ID, the operator, exact target IDs, authorization and the two pinned digest values. Do not put credentials or personal records in this file. Keep configuration root-owned and not service-writable.
4. Run a one-shot observation with a disposable writable state directory before enabling the service:

```
node /opt/neo-angelN/angelN.mjs --config /etc/neo-angelN/config.json --state-dir /tmp/neo-angelN-acceptance --once
```

5. Review the report, inspect the unit and confirm Node 22+ is available through `/usr/bin/env` in the unit’s fixed system PATH. Then an authorized administrator can install the unit in `/etc/systemd/system/` and run:

```
sudo systemctl daemon-reload
sudo systemctl enable --now neo-angelN.service
systemctl status neo-angelN.service
journalctl -u neo-angelN.service
```

6. Verify reboot startup, continued operation after logout, least privilege, real endpoint observations, baseline mismatch handling, config withdrawal, SIGTERM and recovery on that actual host. No host has passed these acceptance checks in this gate.

Pause/remove:

```
sudo systemctl disable --now neo-angelN.service
```

After it is stopped, the administrator may remove the unit and program/config files. Retain or remove observation logs according to the owner's retention choice. Existing stock services are not renamed or replaced.

## Integration and next gate

- Guardian: retain the visible Android foreground-service and STOP control; this Linux adapter does not enroll the phone or bypass Android restrictions.
- NEO Operations board: preserve each observation's scope, confidence, check time and `applicationHealth: unverified`. No collector or remote write credential is installed by this package.
- AI: analysis may later consume minimized observations through the existing NEO Router and incident ledger. This gate invokes no model and executes no returned instructions.
- Decentralization: enroll independently owned hosts and failure domains; do not turn one control plane into a global single point of failure. Distribution is voluntary installation, never self-propagation.
- Malware scanning: add a separately verified scanner adapter and signature/update policy before claiming antivirus detection. Keep remediation, operator authorization, and device enrollment separate.
- Windows Services, macOS launchd and NEO Nous OS adapters are future work, not implemented or activated.

Next acceptance gate: select one persistent authorized Linux host, review the pinned release, provision enrollment there, run the real boot/logout/stop tests and connect authenticated reporting with revocation. No new host purchase or production deployment is included in this PR.
