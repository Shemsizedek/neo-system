# Project 144 — Gate 09 Holytemples Domain Alignment

Date: 2026-10-22
Status: Alignment identified; DNS and HTTP destination unverified.

## Source of truth
- `README.md` on `Shemsizedek/neo-system` declares **https://neo.holytemples.org/** the official NEO app.
- Connected WordPress.com sites list `holytemples.org` as the primary domain for **World Temple** (Atomic).
- Confirmed Render workspace `NEO workspace` has `neo-core-staging` (static site, last deployment live) and `neo-system` (web service, latest deploy update_failed).
- Render primary service currently has `Yarn start` and logs `Yarn: command not found`.
- Attempts to resolve/GET `neo.holytemples.org` and Render URLs from available execution network failed; this does not establish public outage or DNS absence.
- No verified DNS records, TLS certificate, custom-domain association or domain routing evidence for `neo.holytemples.org`.

## Decision
**Preserve `neo.holytemples.org` as canonical production hostname.** A new production hostname is not justified merely because external HTTP probes are inconclusive. Do not overwrite existing DNS.

## Conditional alternative
If DNS and hosting inspection confirms that the canonical hostname is unavailable or reserved for a different app, propose `neo-core.holytemples.org` for a controlled staging/recovery endpoint, subject to verified DNS authority, conflict checks, Render domain mapping, TLS issuance and explicit production-change approval.

## Checklist
- [ ] Read current authoritative DNS zone and NS delegation for holytemples.org
- [ ] Verify existing neo CNAME/A/AAAA and provider routing
- [ ] Verify Render custom-domain mapping and TLS for canonical hostname
- [ ] Run public HTTP GET and /healthz checks with sanitized logs
- [ ] Confirm production frontend topology, rollback and routing
- [ ] Only then approve DNS/hosting edits or alternate hostname

No DNS or Render service modifications performed.
