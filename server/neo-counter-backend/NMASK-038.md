# NMASK-038 staging certification gate
This branch adds a CI workflow for the NMASK-033 through NMASK-038 focused JavaScript tests and a fail-closed staging evidence checklist. The checklist does not authenticate its own artifacts: the CI/staging system must supply artifacts produced by independent tests.
The local NMASK-032 ZIP was executed on 2026-10-20: **351 passing, 2 skipped, zero failures**. This result does **not** prove the GitHub feature branches compile or pass their cumulative tests.
Live staging remains blocked until (1) real NEO Pass issuer/JWKS and session revocation, (2) trusted Bitcoin Core and Counterparty tip reconciliation, (3) issuer provenance for NOMNI and other assets, (4) durable database tests, (5) frontend builds and (6) complete integration tests.
No merge, production deployment, wallet signing, transaction broadcast or settlement is authorized by these checks.
