# CASHFLOW-009 — Isolated free PostgreSQL provider decision

Decision status: **RECOMMENDED / NOT PROVISIONED** (2026-10-18).

## Authorized infrastructure inspected
- Render workspace `NEO workspace`: `noogle-connect-dev` (free) and `neo-pads-production` (paid) only; both belong to other applications and are excluded from NEO Deal Desk staging.
- Existing `neo-deal-desk` Render service is a public web proxy, not a protected private staging API.
- Render rejected a third free database at CASHFLOW-008: `cannot have more than one active free tier database`.

## Candidate comparison
| Service | Free stage | Limitation | Evaluation |
|---|---|---|---|
| Neon | up to 100 projects; 1 GB/project; 100 CU-hours/project per month (provider announcement 2026-10-02) | Publicly reachable PostgreSQL endpoint must have TLS, strong credentials and network controls; free compute can sleep | **Preferred for synthetic staging** |
| Supabase | 2 active free projects; ~500 MB/project | Can pause after 7 days of low activity; no automatic free backups | Alternative |
| Aiven | 1 GB PostgreSQL free, backups | No free-plan VPC, possible inactive shutdown | Fallback |

Provider sources: https://neon.com/blog/neon-free-plan-1-gb-per-project ; https://supabase.com/pricing ; https://aiven.io/docs/products/postgresql/concepts/pg-free-tier

## Deployment security contract
1. Explicit user-owned Neon account and project authorization required. No evidence currently that such an account is connected; no project created.
2. New project/database dedicated **only** to NEO Deal Desk staging; not the same credentials/project as any other NEO application.
3. Seed only synthetic leads until access-control, privacy, backups and retention reviews succeed. Never paste DATABASE_URL, passwords or PII into GitHub, logs or chat.
4. Use PostgreSQL TLS verification with provider CA and short-lived/scoped credentials where available. Password auth alone is not private-network isolation.
5. Operator API must have cryptographically validated OIDC JWT issuer/audience/JWKS, role checks, access logging without PII and rate limits before receiving real customer records.
6. No public staging URL or live transactional feature activation until verified authenticated gateway and real integration tests pass.
7. Acceptance: migrations run in dedicated project, durable insert/restart, duplicate rejection, agent provenance, operator 403/200, and forbidden payout/M&A execution checks.
8. Maintain a rollback/export plan and periodic backups consistent with the provider tier.

## Next gate
CASHFLOW-010: obtain access to a user-authorized Neon project (or chosen alternative), provision isolated database, configure secret handling, run migrations and test synthetic traffic. Do not claim provisioning until provider returns a real project/database identifier and connection tests pass.
