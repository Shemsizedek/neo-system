# NSEC-034 — Authoritative DNS and hosting preflight (2026-10-14)

Verified using authenticated WordPress.com domain management, NEO connected host, and Vercel project discovery:

- `holytemples.org`: active WordPress.com registration, expires 2027-08-29, auto-renew enabled; authorized account can manage DNS; authoritative WordPress.com nameservers and DNSSEC enabled.
- Existing zone contains `guardian` A `8.232.127.249`, `crown` A `34.172.66.0`, and other independently routed NEO subdomains.
- **No `connect` DNS record** in the authoritative WordPress.com zone.
- `guardian.holytemples.org` returned HTTPS 200 via Google Frontend on the connected NEO server.
- Connected Vercel account lists `neo-system` project (`prj_iXYDNVT801zAuSSzTWVxGdWOIsRr`). A project-domain lookup returned 404, so it is NOT verified as hosting `connect.holytemples.org`.
- Earlier repository inspection identified a `server/neo-edge/server.mjs` hostname registry; `connect.holytemples.org` needs approved routing before sharing its existing load-balancer address.

## Release decision: DNS change withheld

Do not set a guessed A/CNAME record. First provision/verify the exact backend hostname and TLS certificate or provider-specific domain binding, plus valid routing for `connect.holytemples.org`. Only then create a WordPress.com DNS record via authorized domain management, with the concrete verified destination.

## Next deployment checklist
1. Pick actual deployment (isolated Google Cloud service vs verified Vercel project) and obtain authoritative target.
2. Configure host routing and TLS for Noogle Connect static preproduction UI only, without enabling privileged actions.
3. Add exact WordPress.com DNS record; verify propagation, certificate hostname, host routing, response security headers and rollback.
4. Do not enable enrollment before real NEO Pass WebAuthn end-to-end certification; no terminal access until agent-level authorization, auditing and explicit approval.

This document changes no DNS, production services, APKs or security configurations.
