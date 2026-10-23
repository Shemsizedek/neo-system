# NES-009 — NEO Energy Customer Portal & Community Energy Exchange

Stage: design and simulation-only prototype. No customer accounts, production billing or transfer of value activated.

## Product contract
Customer roles: account holder, authorized site member, utility support operator, meter auditor and engineering reviewer. Tenant isolation is mandatory. Avoid exposing account holder usage, addresses or meter identifiers across organizations.

### Portal views
1. Energy overview: grid imports, exports, net flow, site-generated kWh and interval quality.
2. Bill simulator: illustrative consumption charges and eligible credit scenarios labeled NOT A BILL.
3. Community energy ledger: provenance of each nontransferable simulated energy credit; cannot create value from estimates or unverified data.
4. Solar participation: modeled subscriptions and generation attribution with no investment/return promises.
5. Reliability: outage notices and history; distinguish simulated incidents from actual outages.
6. Support: customer corrections requests, meter exceptions and dispute tracking.

### Safety, legal and accounting boundaries
- Physical kWh is not currency. Energy settlement differs from CES mutual-credit accounting, V-dollars, time equity and NOMNI; bridge only through independently authorized contracts, tariff rules and ledger reconciliations.
- Tariffs, utility authorization, customer consent, interconnection and consumer protection vary by jurisdiction. No 'energy tokens' or bill offsets automatically represent legally enforceable claims.
- Only revenue-grade validated meter data under authorized tariffs can enter production invoicing; synthetic, estimated and laboratory data are never eligible.
- Credit ledger is append-only with compensating reversal entries, never mutable balance overwrites.
- External communication is read-only or advisory; remote dispatch not available.
- Timestamp, units, billing period and export-credit basis must appear on all statements.

### Data flow
meter event -> quality/provenance validation -> site interval rollup -> tariff simulator -> statement projection -> customer portal.

### Next implementation deliverables
Authentication integration via NEO Pass, role permissions, persisted append-only ledger, authorization tests, signed-meter provenance validation, tariff versioning, customer-support workflows, accessibility and localization. No live use until compliance review.
