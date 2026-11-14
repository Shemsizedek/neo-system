# NEO-CONNECT-005 — Android Termux Mobile Validation / Correct Linux-vs-Android Boundary

Date: 2026-11-13 (America/Chicago)
State: STAGING ONLY / NO LIVE ANDROID VPN PROOF / NO HOST RESTORE

## Operator evidence from the actual Android Termux screenshot

- The operator completed a package installation, with \`nodejs\` version **26.3.1** installed. During the upgrade \`nodejs-lts\` (24.17.0) was removed as requested by the package manager. This is **not** proof that Node is broken or \`npm\` is permanently missing; use \`node -v\`, \`npm -v\` as direct runtime checks.
- \`df -h /\` reported \`/dev/block/dm-12\` at 100% utilization, 647M size. This measures **Android's root filesystem mount**, not necessarily Termux's writable application data partition. Do not treat this as full Termux storage, delete system files, remount partitions or clear app data based on that output.
- \`systemctl\` was not found because this is Android Termux, not the separately enrolled Crown Linux server. The command must be run **only on the actual machine running systemd**, never in Termux.
- A successful \`curl -I --max-time 8 https://mcp.sentinelx.app\` returned HTTP/2 200. That supports **phone-to-SentinelX HTTPS reachability at that moment**, not SentinelX agent enrollment, live Crown node status, peer WireGuard handshake, NetBird connection, Wi-Fi RSSI, multi-WAN failover or packet continuity.
- SentinelX connected inventory still listed zero online hosts with \`crown-node-001\` offline. Do not mint a second enrollment for that existing host or consider it restored because the phone can reach SentinelX's public HTTPS website.
- SentinelX response headers may identify its own CDN provider; they are not evidence of Cloudflare being used by NEO infrastructure, and do not justify DNS changes.

## New safe phone diagnostic

One self-contained read-only Node.js module under \`services/neo-vpn/diagnostics/connect-005-termux.mjs\`:
- Computes free MiB and class from filesystem stats for the **Termux \`$HOME\` and \`$PREFIX\` directories**, not \`/\`. Often these directories live on the same data filesystem; a duplicate result is expected.
- Uses fixed HTTPS HEAD requests only to \`example.org\` and \`mcp.sentinelx.app\`, with a bounded timeout and verified HTTPS certificates. It does not print response headers, IPs, SSIDs, private keys, auth tokens, device identifiers or location.
- Never calls \`systemctl\`, enables Wi-Fi, changes routes, invokes NetBird authentication, restarts services or attempts privileged networking.
- Can run with \`--offline\` to skip internet requests. It never marks a VPN or a Crown host live.

Run on Android Termux (Node.js already installed based on screenshot):

~~~sh
node -v
npm -v
df -h "$HOME" "$PREFIX"
curl -fsSL 'https://raw.githubusercontent.com/Shemsizedek/neo-system/feat/neo-connect-005-termux-mobile-validation/services/neo-vpn/diagnostics/connect-005-termux.mjs' -o "$HOME/connect-005-termux.mjs"
node "$HOME/connect-005-termux.mjs"
~~~

If you cannot download from GitHub, check \`df -h "$HOME" "$PREFIX"\` and \`node -v\` directly; don't interpret unavailable download as a storage or radio issue.

The output of the diagnostic is a **sanitized local observation**; the phone is the target device, and a remote ChatGPT container does not measure the phone's signal. \`PHONE_HTTPS_REACHABLE\` means the two public HTTPS probes passed, **not** that the user is on Wi-Fi (versus mobile data) or that the NEO private tunnel works.

## Optional physical Wi-Fi signal survey

The private diagnosis does not infer RSSI from public HTTPS response time. To assess actual range in a room, use Android's built-in Wi-Fi details, or (with explicit Android permission) the Termux:API companion app and \`pkg install termux-api\`. Never paste full \`termux-wifi-connectioninfo\` output because it can include SSID/BSSID/MAC and network identifiers. Compare RSSI in dBm near router versus farthest work area:
- **Approximately -55 dBm or higher:** strong.
- **Around -67 dBm:** typical usable target for reliable communications.
- **Below -75 dBm:** often weak/unstable; evaluate access-point placement or a wired-backhaul AP/mesh.
These are approximate planning ranges, not measurements from the screenshot.

## First encrypted phone peer

Use the **official NetBird Android application** (not \`netbird\` \`systemctl\` commands in Termux) with authorized SSO/MFA. Do not alter Android's existing VPN connection without assessing conflict with other VPN apps. NetBird's app can authenticate the Android peer; a real second approved Linux/desktop device is still required to test a peer handshake and private application request. Follow NET-008 and NET-012. The private \`10.144.0.0/16\` address space remains a proposal until a NEO-controlled gateway and firewall routing are attested.

## Acceptance

| Required observation | Source | Status |
| --- | --- | --- |
| Node.js installation | Screenshot | PASS / installer output says v26.3.1 |
| Termux HOME/PREFIX free capacity | Android local diagnostic | NOT TESTED |
| Phone public HTTPS | Screenshot | PASS to SentinelX at one instant |
| Wi-Fi RSSI and property coverage | Physical radio survey | NOT TESTED |
| Official Android NetBird client enrolled | Android app | NOT ATTESTED |
| Two independent encrypted peers | Second real machine + test | NOT ATTESTED |
| Crown Linux host recovery | SentinelX connected host inventory | OFFLINE |
| Cellular switching without service interruption | Controlled physical test | NOT TESTED |
| NEO-owned \`10.144\` routing | Linux gateway + ACL proof | NOT ATTESTED |

Decision: **HOLD_REAL_DEVICE_EVIDENCE**. No account, subscription, secrets, production services, routes or device access rights changed.

## Test command

\`node --test services/neo-vpn/tests/connect-005-termux.test.mjs\`

Mocked tests validate redaction and safe classifications, not live phone internet, network signal or VPN handshakes.
