# NMASK-036 — NeoMask live identity / Counterparty reader staging
Adds server-side RS256 JWT/JWKS verification and session-revocation contract, plus an allowlisted HTTPS Counterparty v2 read adapter.
No production issuer URL, JWKS, credentials, active NEO Pass session store, trusted Bitcoin node, or independently reconciled Counterparty instance was supplied or connected.
Do not accept JWKS from the token header. Supply jwks from a pinned issuer's metadata retrieved through a trusted server channel, rotate keys safely, and bind the configured issuer and audience.
The JWT verifier requires a trusted server-side revocation lookup prior to returning a usable principal. Support for other algorithms is intentionally withheld pending audit.
The Counterparty balance reader returns `verified:false` until Bitcoin Core tip, Counterparty height and issuer metadata are reconciled.
Run `node --test server/neo-counter-backend/neomask-oidc.test.mjs server/neo-counter-backend/neomask-counterparty-reader.test.mjs`.
Live deployment, signatures, transaction broadcast, and settlement are not activated. Current feature branches remain dependent on PRs #1051, #1052, #1053.
