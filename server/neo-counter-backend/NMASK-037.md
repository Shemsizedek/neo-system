# NMASK-037 — Read-only chain and asset reconciliation
Introduces fail-closed Bitcoin/Counterparty chain-tip reconciliation, Counterparty issuer/divisibility validation and pending/confirming/confirmed activity classification.
This code validates **supplied** authenticated observations; it does not independently connect to Bitcoin Core or Counterparty, establish trusted source credentials, verify a Bitcoin address checksum, or certify issuer provenance. The registry verification field must be set by an independently trusted backend—not accepted from an untrusted request.
The chain comparator currently requires equal tip heights and hashes; production Counterparty indexing may lag and requires height-specific Bitcoin block hash lookup before accepting unequal heights.
Tests: node --test server/neo-counter-backend/neomask-reconciliation.test.mjs
Do not enable payments, signing, broadcasting, settlement or public verified-balance claims before staging evidence and security review.
Depends on NMASK-033 through NMASK-036.