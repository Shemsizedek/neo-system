# NEO-MULTICLOUD-004 — Operator-Run Live Handshake Verification

Status: CODE-READY / NO LIVE NETWORK OR SECOND DEVICE ATTESTED
Date: 2026-11-13 America/Chicago
Change location: existing NEO-MULTICLOUD-003 draft branch (PR #1426), to avoid adding another dependent PR.
Dependencies: NET-015 one-shot private service and NET-016 operator evidence.
No paid infrastructure, account enrollment, private key access, DNS, firewall or production changes performed.

## Current source observations

The Android phone passed storage and public HTTPS checks in Termux; this is **not** NetBird encrypted connectivity. SentinelX lists 0 connected hosts, with the original enrolled Crown node offline. Neither the GitHub build machine nor a Render/Neon/Vercel app is a verified persistent VPN peer.

## Actual operator steps

1. On Android: install the official NetBird application, authenticate in an approved account, enable its VPN with OS consent, and confirm the app is connected. Do **not** run Linux `systemctl` commands in Termux. Preserve any existing Android VPN settings and review conflicts.
2. On one independently authorized Linux device: install/activate the official NetBird Linux client through its approved operator procedure. The device must actually be online. For a personal smoke test two devices owned by one person are sufficient, but the institutional NEO gate requires distinct authorized operators and separate review.
3. Confirm the Android peer is visible in the Linux client and note the Android NetBird-assigned peer IP **locally only**. Do not paste peer IPs or full `netbird status -d` into a public issue; the full command includes keys and endpoints.
4. From the reviewed feature branch, on Linux run the **read-only redacted peer observer**:

       node services/neo-vpn/diagnostics/multicloud-004-peer-observe.mjs --peer-ip ANDROID_NETBIRD_IP

   Replace the placeholder on the Linux machine with the actual NetBird overlay IPv4 (100.64.0.0/10). The script executes only `netbird status --detail --filter-by-ips` with bounded arguments. It does not reconfigure or connect the VPN. It never prints private addresses, keys, hostnames, or raw CLI output. It marks a peer connected only if **that exact peer** has Connected status, P2P/Relayed type, and a last handshake not more than 180 seconds ago.
5. If the sanitized output reports `LOCAL_PEER_EVIDENCE_PRESENT_REVIEW_PRIVATE_REQUEST`, this proves only that a local NetBird status read supported an operator-level handshake observation. It does not prove the private application worked. Keep the actual Linux console observation for separate independent review.
6. Then run the **one-shot authorized private HTTP service** from NET-015 (on the Linux NetBird interface, approved Android source, temporary TCP 18443 rule). From Android Termux, make the private HTTP request:

       curl -fsS --max-time 8 http://SERVER_NETBIRD_IP:18443/neo-private-probe

   Do not use an arbitrary public URL or 0.0.0.0 listen address; validate permitted service first, then unauthorized peer denial independently. The request and the Linux status should be close in time.
7. Record the resulting statuses locally in the existing NET-016 evidence file and run the NET-016 evaluator. Do not commit raw evidence, fingerprints or public IPs.
8. Institutional promotion additionally requires default-deny ACLs, blocked guest-to-admin/finance/bots paths, actual peer and application-session revocation, distinct authorized operators, owner-approved routes and host qualification. No program automatically advertises the NEO `10.144.0.0/16` private space.
9. Wi-Fi signal strength and cellular last-mile failover are still separate physical connectivity tasks. A NetBird overlay can secure traffic but cannot increase radio range.

## Output decision table

| Evidence output | Interpretation |
| --- | --- |
| HOLD_NO_RECENT_PEER_HANDSHAKE | No exact connected peer with fresh parseable handshake, or NetBird CLI missing |
| LOCAL_PEER_EVIDENCE_PRESENT_REVIEW_PRIVATE_REQUEST | A read-only local CLI report for this peer was connected with recent handshake |
| PERSONAL_PILOT_REVIEW_ELIGIBLE_NOT_CERTIFIED (NET-016) | Operator reported required peer, private HTTP and access policy checks PASS within allowed window |
| INSTITUTIONAL_REVIEW_ELIGIBLE_NOT_CERTIFIED (NET-016) | Operator reported all institutional tests PASS; still needs independent reviewer |
| Production enabled | NEVER from these observers |

No automatic cloud switch, peer enrollment, VM provisioning or firewall change is authorized by this gate.

## Tests and documentation

Test: `node --test services/neo-vpn/tests/multicloud-004-peer-observe.test.mjs`
Locally executed pure unit test suite: nine tests PASS, zero failures (simulation only).
Official NetBird CLI source: https://docs.netbird.io/get-started/cli
Client troubleshooting: https://docs.netbird.io/help/troubleshooting-client
