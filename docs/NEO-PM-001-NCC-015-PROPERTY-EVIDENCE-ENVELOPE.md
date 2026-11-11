# NEO-PM-001 / NCC-015 — NEO Property Manager: Crown Chain Evidence Envelope

**Status:** development branch, synthetic-only test prototype; not deployed; no legal filings, actual property entries or on-chain transactions.

NEO Property Manager is a new product alongside NEO Deal Desk (acquisition sourcing and underwriting), NEO Crown (issued-asset metadata/proofs), and Tribunal (notice and service evidence). It can maintain property records, written owner mandates, maintenance tickets, vendor approvals, tenant/lease information, invoices, access logs and restricted original documents.

## Operational distinction
- Unsolicited owner offers, properly purchased secured claims, qualified tax/foreclosure auctions, and voluntary company-interest purchases are potential aggressive acquisition paths.
- A hostile bid is not a self-help right to take possession; nonresponse cannot grant consent, ownership or mortgage servicing authority.
- Adverse possession in Texas remains a distinct fact-based statutory doctrine requiring qualifying possession over time.
- Third-party property management is contingent on verified owner/controller authorization. Licensed activities remain subject to TREC requirements.

## Architecture
Use the existing:
- `docs/TRIBUNAL_V1_5_SERVICE_LEDGER.md`: recipient-level notice delivery attempts and an **internal** proof of service.
- `server/neo-bots/ces-announcement-evidence.mjs`: source-graded CES journals (TV-0 ... TV-4).
- `governance/NEO_PUBLIC_LEDGER_IDENTITY_STANDARD.md`: provenance and access rules.
- `orchestration/deal-desk-pipeline.yaml`: authorization checks before external action.
- NCC-014 issue #1405: parent architecture.
- NCC-013 issue #1235: Crown issuance metadata workflow (not verified live mainnet).
- NIBIRU-048 #1365 and NIBIRU-050 #1377: NEO Houses pilot and cost qualification.

The `evidenceEvent` object includes an opaque asset ID, source class/ref, SHA-256 digest, event time, linked event ID, claimed legal-effect classification, and access tier. The ledger is append-only and hash-chained. It records a CES journal **without needing an on-chain NOMNI transfer**; Bitcoin / Counterparty broadcasts are separate publication events. A publication message is not itself a property deed or legal service. The `preparePublicCommitment` method produces an opaque SHA-256 commitment with secret nonce: public proof does not expose private evidence files, source addresses, occupant data, or even the raw original hash.

## Test
```bash
node --test tests/neo-property-manager/evidence-envelope.test.mjs
```

Expected outcomes: (1) CES ledger/broadcast event separation, (2) tamper detection, (3) no private case details in public receipts, (4) no right to enter/manage property absent independently authorized legal control, (5) rejection of invented legal-effect source classes.

## Limitations
Current prototype verifies **internal ledger integrity only**, not original government signatures, valid title, actual external delivery, a real CES account, or a Bitcoin mainnet transaction. `EXTERNALLY_VERIFIED` is a label requiring a separate authenticated source adapter; no label is self-proving. Client claims of verification must not be trusted.

## Next acceptance gate
1. Identity-authenticated private evidence vault and access logging.
2. Real title report/deed lookup and officer/controller legal authority workflow.
3. Court-ordered vs owner-authorized entry and written management mandate.
4. Reconcile actual CES debit/credit journals with their account holders and transaction references.
5. Check independent Counterparty/Bitcoin block and transaction existence before changing publication state.
6. Add records retention/redaction and tenant privacy policies; publish only authorized sanitized property information.
7. Fail-closed tests; proof of authorized dry-run on one synthetic property.
8. Human confirmation before production, token issuance, asset-linked offering, property entry, notices intended as legally effective service, or any filing.

## Primary authorities
- Texas CPRC Chapter 16: https://tcss.legis.texas.gov/resources/cp/htm/cp.16.htm
- TREC property management licensing: https://www.trec.texas.gov/q-does-property-manager-have-be-licensed
- Harris County tax auctions: https://www.hctax.net/Property/TaxSales
