# Orange ESOP API Contract v0.1

This contract is additive and implementation-neutral. Business-mutating endpoints MUST require authenticated role checks and MUST fail closed while the program or participant is under RECONCILIATION_HOLD. An authorized reconciliation recovery operation is explicitly exempt so a corrected ledger can be revalidated and the hold cleared.

All monetary, share, and token quantities cross the API as decimal strings, never binary floating-point numbers.

## Read routes

### GET /api/esop/plan
Returns plan identity, sponsor status, trust identity, activation state, current valuation reference, adopted vesting-schedule reference, and token-mapping status.

### GET /api/esop/participants/:id
Returns the caller-authorized participant record, plan-year eligibility, allocation, vesting, beneficiary completion, and stewardship summary.

### GET /api/esop/certificate/:id
Returns certificate metadata only when allocation, valuation, underlying-interest mapping, reconciliation, and trustee approval are complete.

### GET /api/esop/statement/:id
Returns the annual ESOP + Holy Stewardship statement.

### GET /api/esop/reconcile/status
Returns the most recent reconciliation run and hold state.

## Calculation routes

### POST /api/esop/eligibility/calculate
Input: employment status, class, age/service facts, participating-employer status and plan year.
Output: eligible, eligibilityDate, nextEntryDate, reasonCodes.
Persistence: stores the authoritative participant + plan-year eligibility record.

### POST /api/esop/allocation/run
Input: participant ID, plan year, authoritative eligibility reference, participant compensation, total eligible compensation, employer contribution pool, FMV/share, approved token ratio.
Output: allocationValue, employerShares, neotrustUnits.
Guards: participant must be eligible for that plan year; participant compensation cannot exceed aggregate eligible compensation; no write if token mapping, valuation, reconciliation, or trustee approval is missing.

### POST /api/esop/vesting/calculate
Input: years of service, allocated NEOTRUST, adopted vesting schedule or schedule ID.
Output: vested percentage, vested units, unvested units.
Guard: vesting MUST be derived from the adopted plan schedule; special vesting events remain policy-controlled and are not inferred.

### POST /api/esop/reconcile
Authorized recovery route. It remains callable while a hold exists.
Checks:
1. all required quantities are present, finite decimal values and non-negative;
2. reserve = suspense + participant allocations + unused authorized balance;
3. represented underlying interest <= documented underlying interest.
Failure status: RECONCILIATION_HOLD.
Pass status may clear a prior hold only through an authorized state transition recorded in the audit log.

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
