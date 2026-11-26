# NEO Angel — identity and first persistent host gate

## Project identity recorded from NEOsync

NEO Angel is NEOsync's positive counterpart to the daemon concept, inspired by the Temple 101s teaching attributed by NEOsync to Noble Drew Ali: “An angel is a thought of God Allah.” This is the project's supplied spiritual and cultural foundation, not a newly verified historical quotation.

NEO Angel is a decentralized computer program operating in the background without a required GUI or interactive user session. Its purpose extends beyond internet security to authorized NEO work and mutual benefit for humanity, culture and society. The project's 999 identity expresses that direction; `N` is its chosen naming convention for neutral/nature/Omniversal systems. These are project conventions, not an operating-system standard or security guarantee.

The intended global environment grows through consenting operators enrolling independent hosts. Each node retains local supervision, pause, removal and least privilege. Internet connectivity alone does not enroll a computer. Security protects against malicious use of background programs; the mere presence or name of a daemon is not evidence of malicious activity.

This initial runtime implements availability observations and limited program integrity checks. Broader NEO task execution, AI orchestration and scanner integration require their own reviewed adapters and scopes. The vision is broader than this first implementation. No donation, payment, issuance or financial authority follows from host enrollment, and autonomous software still requires compute, power and network resources.

## Verified discovery — 2026-11-08 UTC

| Resource | Observation | Consequence |
|---|---|---|
| SentinelX `crown-node-001` | Enrolled, offline; last disconnected 2026-10-24 03:17:50 UTC | Existing enrollment intact; no host commands can run until reconnection |
| Desktop Commander `penguin` | Offline, last seen approximately 140 hours earlier | No installation or host acceptance possible through this connection |
| Render `NEO SYSTEM` | Existing web services and static sites found; listed web services use free compute | These records do not establish a persistent administrative Linux host |
| PR #1347 head `d50d75d060cdfe7961e1bc558589cdb6e7b55df2` | build, validate, inventory, implementation-truth and CodeQL checks passed; eight Workers Builds checks failed | Do not claim all CI passed; investigate build failures separately before release |

No host was installed, enrolled, rebooted, restarted or verified continuously during discovery. The ephemeral coding workspace is not a replacement for a persistent NEO host. No cloud account or paid resource was created.

## Enrollment path

First choice: restore `crown-node-001` to power/network and its existing SentinelX agent. A local administrator can inspect `systemctl status sentinelx-cloud-core`; if stopped, `sudo systemctl start sentinelx-cloud-core` restores the existing connection. That action must occur on the actual host, not in a browser terminal or this coding workspace. The disconnected host cannot currently receive that command remotely.

When connected, inspect capabilities and read-only state, confirm Node 22+, systemd, owner authorization, root-owned installation paths and writable private state. Use the reviewed installation instructions in README.md, then collect actual host evidence. Do not replace existing production services or silently install on unrelated machines.

The read-only helper `node services/neo-angelN/host-readiness.mjs` checks the current machine's prerequisites, two pinned installed runtime digests, config-file ownership/write protection, and systemd active/enabled status. It does not read enrollment contents, configure enrollment, install dependencies, start services, scan the network or claim reboot/logout testing. Exit 2 means incomplete or blocked. Exit 0 is a limited installation observation, not continuous-operation proof. Review the helper and its pinned digests before using it on a host.

Required evidence before closing this gate:

1. Record the authorized host identity and reviewed release; verify installed bytes match the two pinned runtime digests.
2. Record active/enabled status and two real observations separated by at least the configured interval; retain their timestamps and source, including actual unavailable endpoints.
3. Verify observations continue after the administrator logs out. Test reboot startup only in an owner-approved maintenance window, since the host may support other work.
4. Verify stop/pause, baseline mismatch, withdrawn authorization and recovery on the host without replacing any production files with test payloads.
5. Keep reboot/logout and continuous operation pending until those observations exist. A schedule, unit file or passing local test does not satisfy them.

## Hosting fallback discovery

Render's current free service documentation states that free web services spin down after 15 minutes without incoming traffic, lack SSH/shell access and persistent disks; other service types do not support Free instances. They therefore cannot satisfy this systemd host acceptance gate. Do not use artificial keepalive traffic to represent continuous availability.

Oracle advertises Always Free compute, but signup requires accurate identity/contact and card verification, with possible temporary authorization holds; eligibility and capacity remain unverified for this user. Its terms prohibit multiple free accounts per person. No account was created or billing information supplied. This is a researched fallback, not a provisioned host or uptime guarantee.

Sources checked 2026-11-08: https://render.com/docs/free and https://www.oracle.com/cloud/free/faq/ . The existing owned host remains the first route because it requires no new provider account or spending.

## Gate state

VERIFY completed for connection discovery; CONNECT blocked by offline hosts; BUILD provides the reviewed candidate and readiness helper; TEST has local evidence only; DEPLOY pending actual host access; DOCUMENT recorded here; NEXT GATE remains first-host acceptance. Do not mark this gate complete until the Linux host evidence is available.
