# NEO eFax Worker — staging scaffold

Zero-cost candidate: Cloudflare Workers free tier, subject to account eligibility and limits. No Cloudflare account or deployment has been verified.

Endpoints: GET /health (non-sensitive health status); POST /fax/send (always 503; no document processing). No authentication, document storage, or fax transmission is enabled.

Deploy only after Cloudflare authorization, compatibility checks, and secure configuration. Never commit Neon DATABASE_URL or IRS documents. Neon migrations and authenticated job tracking remain future gates. Do not enable public fax submission without authentication, rate limits, audit logging, retention policy, and an approved carrier.

Local validation: import src/index.mjs and call its fetch handler with Request objects; assert /health 200 and /fax/send 503.
