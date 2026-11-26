# NEO-CONNECT-001 — Local Wi-Fi Assessment and Private Network Staging

**Date:** 2026-11-13
**Status:** REVIEW-ONLY; NO NETWORK CHANGE; NO LIVE GATEWAY ATTESTED
**Existing baselines:** NET-007-FREE-MESH-PILOT, NET-008-FIRST-MESH-ACCEPTANCE, services/neo-vpn/README.md.

## Scope

Diagnose local Wi-Fi signal and brief internet reachability before attempting a NEO Proxy. VPN/proxy software cannot extend the physical Wi-Fi signal or maintain internet service without an upstream connection. Preserve the existing NEO private network 10.144.0.0/16, gateways 10.144.1.0/24 and admin 10.144.10.0/24.

This gate must not change router settings, DNS, VPN routes, firewalls, production services, keys or third-party accounts. Do not publish diagnostic outputs, Wi-Fi names or network addresses.

## Android / Termux first-pass diagnostic

1. Connect Android to the Wi-Fi to evaluate, while retaining cellular as an available fallback.
2. Install Python in Termux: pkg install python
3. Optional Wi-Fi RSSI detail: install the official Termux:API companion Android app; then pkg install termux-api, and grant necessary Android permissions. Without the companion application RSSI is correctly UNKNOWN.
4. Run from the repository root: python3 services/neo-vpn/diagnostics/connect-001.py
5. For an entirely local Wi-Fi-only check, add the --offline flag. Online mode only resolves DNS and completes brief TLS handshakes to example.org and www.wikipedia.org. It does not measure throughput or capture SSID, BSSID, location, external IP or MAC addresses.
6. Collect results locally near the router, at the far room, and at the intended work location. Do not commit the results to this public repository.
7. Interpret results:
   - WEAK RSSI far from router: reposition the Wi-Fi access point, consider a wired-backhaul access point, then mesh.
   - GOOD or EXCELLENT RSSI but failing TLS: investigate DNS, captive portals, ISP/WAN.
   - UNKNOWN RSSI: obtain Android Settings signal information or enable Termux:API.
   - Working Wi-Fi but unavailable NEO private service: investigate mesh routes separately.

## Private NEO Proxy plan

Reuse NET-007 and NET-008 NetBird free pilot for encrypted peer-to-peer access, not a competing gateway or a public open proxy. Android installation: https://docs.netbird.io/get-started/install/android. Enrollment and SSO require the operator's explicit action. A free NetBird account provides a provider-controlled mesh overlay, not NEO-owned public internet and not an automatic assignment of 10.144.x.x.

Existing Render web services are HTTP-ingress services; they are not evidence of public UDP reachability for a WireGuard endpoint. A fully owned NEO gateway needs a verified Linux endpoint, routes, explicit least-privilege policies, two independently authorized peer devices, actual encrypted handshake, negative ACL tests and revocation.

For internet continuity, use separate fixed internet and cellular connections with an approved dual-WAN failover router. No WAN failover, speed increase, proxy activation or mesh coverage improvement is claimed at this gate.

## Acceptance / evidence states

| Evidence | Result |
| --- | --- |
| Wi-Fi RSSI at three local points | NOT TESTED |
| DNS/TLS from the actual Android phone | NOT TESTED |
| Wi-Fi router/AP topology and primary uplink | UNKNOWN |
| Two independently authorized mesh peers | NOT ATTESTED |
| 10.144.x.x route / policy enforcement | NOT ATTESTED |
| Cellular failover | NOT CONFIGURED |
| Gate decision | HOLD |

## Automated unit tests

Run: python3 -m unittest discover -s services/neo-vpn/tests -p 'test_connect_001.py' -v

Passing these tests only validates redaction and classification; it does not establish real-world connectivity or deployment.

References:
- https://docs.netbird.io/manage/settings/plans-and-billing
- https://render.com/docs/web-services
- https://openwrt.org/docs/guide-user/network/wan/multiwan/mwan3
