# NEO Mail staging

## Purpose
Portable, free-first staging definition for an independent NEO Mail node. This stack does **not** replace Titan or Resend until acceptance tests pass.

## Identity
- Mail domain: `holytemples.org`
- Staging server hostname: `mailtest.holytemples.org`
- Production target after acceptance: `mail.holytemples.org`
- Institutional mailbox: `chaplain@holytemples.org`

## Dependencies
A real MTA host must provide:
- static public IPv4;
- forward DNS A/AAAA for the host;
- administrator-controlled PTR/rDNS resolving the IP back to the same host;
- inbound and outbound TCP/25;
- TCP/443, 465 and 993;
- durable encrypted storage;
- snapshot/backup support.

## Free-first deployment policy
1. Prefer zero-cost/community infrastructure while the service is in development.
2. Oracle Always Free is a candidate staging compute provider, subject to capacity and a successful outbound TCP/25 exemption.
3. Resend stays the verified outbound transport until direct-mail reputation is proven.
4. Titan stays production inbound until NEO Mail passes inbound delivery and failover testing.
5. Source/configuration templates stay portable in GitHub so NEO Mail can migrate hosts without vendor lock-in.
6. No Cloudflare dependency.
7. Do not store secrets, private DKIM keys, mailbox data, API keys or backup archives in this repository.

## Stalwart bootstrap
Use the official `stalwartlabs/stalwart:v1` image. The bootstrap listener on port 8080 is bound to loopback only. Reach it through an SSH tunnel, complete setup, then remove/disable the bootstrap listener after HTTPS is functioning.

Minimum public listeners:
- 25 SMTP server-to-server
- 465 SMTP submission, implicit TLS
- 993 IMAP, implicit TLS
- 443 HTTPS/JMAP/WebUI

POP3 and ManageSieve are excluded from the staging compose unless a real client requirement emerges.

## DNS acceptance sequence
Do not change production MX yet.

When the staging host exists:
1. Add `A mailtest.holytemples.org -> <static-ip>`.
2. Configure host PTR/rDNS `<static-ip> -> mailtest.holytemples.org`.
3. Confirm forward-confirmed reverse DNS.
4. Complete Stalwart setup and obtain ACME TLS.
5. Generate a dedicated staging DKIM selector.
6. Publish staging-specific DKIM and any required MTA-STS/TLSRPT records without replacing Titan/Resend records.
7. Test external outbound delivery and authentication.
8. Add a low-priority/isolated inbound test domain or subdomain before any production MX change.
9. Run restore/failover drills.
10. Only after acceptance consider a controlled production MX migration.

## Decentralization target
NEO Mail should ultimately support at least two independent failure domains:
- primary self-hosted NEO Mail node;
- secondary/failover NEO Mail node or compatible relay/MX;
with Resend retained as an optional outbound relay and Titan removable only after production acceptance.

## Global e-Post evidence
For each institutional message, preserve:
- RFC Message-ID;
- sender and recipient domain;
- timestamp;
- DKIM/SPF/DMARC results;
- delivery/bounce state;
- SHA-256 content hash;
- seal/stamp asset reference;
- optional ledger/token reference.

The evidence layer proves message provenance; it does not by itself establish governmental or international postal recognition.
