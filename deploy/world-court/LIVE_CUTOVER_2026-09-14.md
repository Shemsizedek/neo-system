# World Court production cutover — 2026-09-14

Production DNS authority was restored to the WordPress.com nameservers and `court.holytemples.org` was configured as an A record to the reserved World Court VM IPv4 address `35.253.233.133` with TTL 300.

Merging this marker intentionally triggers the existing `Deploy World Court VM` workflow so the production origin, public DNS, HTTPS, and E-File endpoint can be revalidated after the authoritative nameserver repair.

Expected endpoint: `https://court.holytemples.org/efile`

This marker records deployment state only. The Tribunal software remains an internal institutional records and workflow system and does not itself create external governmental or judicial authority.
