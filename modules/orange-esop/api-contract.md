# Orange ESOP API Contract v0.1

This contract is additive and implementation-neutral. Mutating endpoints MUST require authenticated role checks and MUST fail closed while the program or participant is under RECONCILIATION_HOLD.

## Read routes

### GET /api/esop/plan
Returns plan identity, sponsor status, trust identity, activation state, current valuation reference, and token-mapping status.

### GET /api/esop/participants/:id
Returns the caller-authorized participant record, eligibility, allocation, vesting, beneficiary completion, and stewardship summary.

### GET /api/esop/certificate/:id
Returns certificate metadata only when allocation, valuation, underlying-interest mapping, and trustee approval are complete.

### GET /api/esop/statement/:id
Returns the annual ESOP + Holy Stewardship statement.

### GET /api/esop/reconcile/status
Returns the most recent reconciliation run and hold state.

## Calculation routes

### POST /api/esop/eligibility/calculate
Input: employment status, class, age/service facts, participating-employer status.
Output: eligible, eligibilityDate, nextEntryDate, reasonCodes.

### POST /api/esop/allocation/run
Input: participant compensation, total eligible compensation, employer contribution pool, FMV/share, approved token ratio.
Output: allocationValue, employerShares, neotrustUnits.
Guard: no write if token mapping, valuation, or trustee approval is missing.

### POST /api/esop/vesting/calculate
Input: years of service, allocated NEOTRUST.
Output: vested percentage, vested units, unvested units.
Guard: special vesting events remain policy-controlled and are not inferred.

### POST /api/esop/reconcile
Checks:
1. reserve = suspense + participant allocations + unused authorized balance;
2. represented underlying interest <= documented underlying interest.
Failure status: RECONCILIATION_HOLD.

## Integration adapters

### NEO Books
Receives employer contributions, trust equity, participant allocations, forfeitures, distribution liabilities and valuation references.

### NEOpay
Read participant balances and permitted elections. Restricted ESOP interests MUST NOT expose unrestricted token-send behavior.

### Orange Chip Registry
Provides verified NEOTRUST asset metadata and the approved token-to-underlying-security mapping.

### NEO Explorer
Provides public-safe provenance: Bitcoin TXID, block reference, Counterparty asset/event, document hash. Never publish participant PII.

## Roles
- WORLD_CHAPLAIN: executive overview
- ASSISTANT_GRAND_SHEIK: administrative oversight/exceptions
- SECRETARY: participant records/documents
- TREASURER: financial reconciliation
- PLAN_ADMINISTRATOR: eligibility/vesting/distributions
- ESOP_TRUSTEE: plan-asset approvals
- VALUATION_ADVISOR: valuation submission
- PARTICIPANT: own account only
- AUDITOR: read-only audit
