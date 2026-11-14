# NEO-CONNECT-004 — Recover Existing Linux Host and Verify First Real Tunnel

Date: 2026-11-13
Status: HOST OFFLINE / NO DEVICE HANDSHAKE VERIFIED / REVIEW-ONLY RECOVERY
Depends: draft NEO-CONNECT-003 (#1421), draft NEO-CONNECT-002 (#1420), draft NEO-CONNECT-001 (#1419).
Primary source: live SentinelX host inventory + diagnostic read on 2026-11-13. No live host commands were run because there are zero connected hosts.

## Current observed facts

- Exactly 0 SentinelX hosts are online. \`crown-node-001\` is enrolled but OFFLINE; the last connection was on 2026-10-24, disconnected with \`connection_lost\`.
- SentinelX's own read-only diagnosis: **host_not_connecting (high confidence)**. No agent reconnect attempt was observed after the disconnection. Diagnose recommended checking the machine's power, disk, systemd agent and outbound HTTPS before filing any support report.
- The initial three NEO-CONNECT PRs are still drafts; neither a real NetBird peer nor the NEO \`10.144.0.0/16\` subnet is live-attested.
- Do NOT mint a new SentinelX enrollment for this host; its identity remains enrolled. Do NOT substitute a new Render HTTP web service for a WireGuard UDP endpoint.

## Operator recovery on the *actual* machine (not in ChatGPT's sandbox)

Use a trusted Linux console/SSH access path to the host that belongs to NEO. Do not attempt these commands on another unrelated machine or container.

**Read-only diagnostics:**

~~~sh
uname -s
df -h /
systemctl is-active sentinelx-cloud-core
systemctl is-enabled sentinelx-cloud-core
systemctl status sentinelx-cloud-core --no-pager
journalctl -u sentinelx-cloud-core -n 100 --no-pager
curl --head --max-time 8 https://mcp.sentinelx.app
~~~

Journal output can contain sensitive network addresses or session metadata: **inspect locally**, do not paste full raw logs into ChatGPT, PRs, public issues or monitoring dashboards.

**Optional no-secrets JSON readiness probe** (after checking the script in the feature branch; requires Node 20+):

~~~sh
node services/neo-vpn/diagnostics/connect-004-host-readiness.mjs
~~~

For no external DNS/TLS check:

~~~sh
node services/neo-vpn/diagnostics/connect-004-host-readiness.mjs --offline
~~~

The probe checks only whether the SentinelX systemd unit is active and enabled at boot, disk space *class*, a NetBird systemd unit, DNS resolution and a TLS handshake to the fixed SentinelX management hostname. It does not read passwords, peer keys, IP addresses, system logs, private evidence or network payloads. A PASS means only local prerequisites were found, **not** that the SentinelX host or any VPN is remotely reachable. Some distributions use different service names; in those cases return UNKNOWN/UNAVAILABLE and verify locally.

**Repair requires operator approval and active console access:**
- If powered off, bring the *same* host online through its authorized provider/local console. If disk is full, review disk usage and free space carefully; do not indiscriminately delete logs or backups.
- If the installed SentinelX agent service is inactive and the operator approves a restart, use \`sudo systemctl restart sentinelx-cloud-core\`; then inspect \`systemctl is-active sentinelx-cloud-core\` and local journals. Do not reset credentials or reinstall without evidence.
- Verify host outbound DNS, TCP 443 and local firewall constraints. If the agent runs and can reach SentinelX but remains offline, investigate its service logs and contact support only with redacted evidence.
- Check SentinelX host inventory **again** after reconnect. Only an actual online host status satisfies remote recovery; a local green service check is insufficient.

## Actual two-device tunnel acceptance after host recovery

A SentinelX host is not by itself a WireGuard or NetBird peer. Once a verified NEO-controlled Linux host is available:

1. The owner explicitly approves installing/enrolling the **NetBird Linux client** as pilot peer B. The owner signs in to NetBird from a trusted terminal/browser, and enrolls their Android phone as peer A through the official Android VPN application. Do not copy NetBird keys or tokens into this repository.
2. Review NetBird policy on the control plane. Establish narrow allowed access to an approved non-production test service before disabling a broad default rule. A single operator may use two of their own devices for a **personal smoke test**, but the stricter NET-008 *institutional* acceptance still requires independently authorized operators and negative ACL / revocation checks.
3. On the authorized Linux device, inspect \`netbird status --detail\` locally for evidence of a fresh encrypted WireGuard peer handshake and transport type; do not publish raw peer endpoints or keys.
4. From Android, make a real request to the Linux peer's **private** approved service; compare Wi-Fi vs cellular and note successful and intentionally blocked requests. Public HTTPS reachability from NEO-CONNECT-003 alone cannot certify the private tunnel.
5. Confirm peer revocation removes private access and separately confirm application sessions expire. Do not advertise \`10.144.0.0/16\` before NEO-owned gateway routing and firewall isolation are explicitly reviewed and tested.
6. Preserve independent phone/WAN access to avoid lockout during all tests.

## Acceptance matrix

| Area | Required proof | Status |
|---|---|---|
| Existing host recovery | SentinelX marks same original host connected and operational | NOT VERIFIED |
| Linux local readiness | Read-only agent/disk/DNS/TLS check | NOT TESTED |
| Android client | Actual NetBird connect + VPN authorization | NOT VERIFIED |
| Independent second peer | Authorized Linux node with active NetBird peer | NOT VERIFIED |
| Encrypted communication | Recent handshake and successful private application transaction | NOT VERIFIED |
| Default deny and revocation | Observed negative test and revocation drill | NOT VERIFIED |
| Wi-Fi/cellular continuity | Independent links and actual private application reconnection | NOT VERIFIED |
| Official NEO \`10.144\` route | NEO gateway + narrow routes/firewall + tests | NOT VERIFIED |

Decision: **HOLD_REAL_DEVICE_EVIDENCE**. No zero-trust enforcement or live gateway is declared. No host was restarted, no paid cloud service created, and no router/firewall/DNS configuration changed.

## Regression

~~~sh
node --test services/neo-vpn/tests/connect-004-host-readiness.test.mjs
~~~

Unit tests use mock command/DNS/TLS callbacks. Test passage does not prove physical host recovery or actual VPN operation.
