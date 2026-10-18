# NEO-TMS-G005 — Treasury Window integration

## Delivered
- `TreasuryWindow.tsx` standalone React demonstration view with sample assessment, segregated fund names and simulated trustee approval.
- No real balances, private beneficiary records or payment connectors.

## Not yet complete
- Mount TreasuryWindow in existing App navigation; run build and tests first.
- Complete PostgreSQL transaction posting function (G004 currently intentionally fails closed).
- Implement secure API authentication and server-enforced authorization; no trusting client-supplied actor IDs.
- Persist approvals and member accounts with temple isolation, beneficiary privacy, immutable audit and backups.
- Add automated UI, integration, concurrency and database migration tests.
- Define per-capita frequency, amount precision, lawful collection policy and currency valuation before issuing real assessments.
- Verify all trustee authorities and trust restrictions against governing instruments.

## Release control
NO LIVE TRANSACTIONS, NO BANK OR CRYPTO CUSTODY, NO SECURITIES OFFERINGS. This component is not yet wired into the application shell or deployed.
