# ComFi 014 — Project funding evidence graph

Development module, not a ledger, settlement engine or funding approval service.

`createComfiEvidenceGraph({projectId,records,links})` constructs a read-only model for token issuance/transfers, instruments, CES postings, V-Dollar postings, external bank statements, funding receipts and government opportunity evidence. Place it alongside existing CES ingestion/session adapters; it is not yet wired into a live application.

Amounts must be decimal strings with an explicit scale. Output stores exact minor-unit strings using BigInt arithmetic, with no cross-unit sum, exchange-rate default, automatic asset recognition or consolidated NAV. Use distinct unit codes for native NOMNI, printed instrument NEO, CES account units, V-Dollars, BTC and USD. Never feed rounded JavaScript Number amounts from an earlier importer into this boundary. Multi-leg transactions require distinct per-leg references under the ledger/account namespace.

Each record requires source references, effective date, observation time and an evidence label. Labels are caller-supplied classifications, not cryptographic verification. Operator-selected economic-interest IDs identify related representations for consolidation review; the module cannot discover all duplicates or determine beneficial ownership automatically.

Links distinguish candidate relationships from source-referenced relationships. Source-referenced conversion links require both evidence and a terms reference. The function checks that references exist in the data shape, not that the cited evidence is authentic or proves acceptance. It executes no conversion and does not certify cash settlement, collateral or accounting compliance.

Use a funding case to relate bank records and community-exchange books to an actual lender decision and resulting funding receipt. A statement balance, a deposit label, an instrument face value and money received are different records. Do not encode one as proof of another. Keep government opportunities prospective until applicable eligibility and award evidence exists. No reserve-program admission is inferred from holding BTC or possessing historical instruments.

No live CES session, private bank record, credential, taxpayer identifier or screenshot is included in this branch. A future authorized importer should retain source files privately and store access-controlled references only. This module does not supply storage, authorization, uploads, browser UI, live bank access or protocol signing.

Validation: `node --test apps/neoscan/adapters/ces/comfi-evidence.test.mjs` — six focused tests, including large exact amounts, duplicate replay, cross-ledger namespaces, missing provenance, conversion-term requirements and no automatic eligibility/execution. The root test script already includes apps/neoscan/adapters/ces/*.test.mjs.

Next implementation: connect an authorized exact-decimal source export to this pure model and display evidence relationships in the existing NEO Scan/Deal Desk surfaces. Preserve historical research as source evidence; do not silently convert screenshot transcription into audited financial records. No merge or deployment occurs in this gate.
