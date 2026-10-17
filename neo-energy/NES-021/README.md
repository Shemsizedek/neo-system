# NES-021 — Integrated authenticated-preview contract tests

Adds a simulation-only integration harness combining NES-020 trusted-session
requirements, NES-015 customer views and NES-014 durable simulated readings.

Run locally: `python -m unittest discover -s neo-energy/NES-021 -p 'test_*.py' -v`.

The harness uses explicitly fabricated `VerifiedSession` objects and local
in-memory mock grants **only in tests**. It DOES NOT verify real NEO Pass
signatures, authenticate users, or operate a real server.

## Acceptance before customer release
- Real cryptographic NEO Pass integration with mandatory issuer/audience/expiry/token use.
- PostgreSQL tenant/RLS testing under non-owner restricted roles, including pooled
  connection reuse and privilege escalation attempts. The RLS script from NES-019
  is illustrative and not installed.
- Genuine subject-to-tenant/site grants and revocation audit.
- Security review and secrets rotation; log redaction, rate limiting, session
  fixation/replay evaluation, resilient denial handling.
- Zero production billing, grid switching, CES/NOMNI settlement unless separately approved.

No customer or payment data has been connected. No release deployment.
