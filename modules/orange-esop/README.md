# Orange ESOP v0.1

Additive NEO System module for Chaplaincy employee-ownership administration, Holy Stewardship records, NEOTRUST representation, and Bitcoin/Counterparty audit provenance.

## Status
DESIGN + DATA CONTRACT. No live ESOP allocation, token transfer, trustee action, valuation, or participant benefit is created by this module alone.

## Source architecture
- Chaplaincy Royal Crown Instructions: Secretary and Treasurer separation of duties; Assistant Grand Sheik reporting; Chairman authorization.
- Holy Stewardship: TIME / TALENT / TREASURE service context; TEMPLEBOND and PLEDGEBOND remain distinct from ESOP ownership.
- Orange ESOP: legal employer-security interest is authoritative; NEOTRUST is a representation/registry layer only where governing plan/trust/corporate documents make it so.

## Invariants
1. Wallet possession is never the participant identity.
2. NEOTRUST represented ESOP interest must not exceed documented underlying ESOP interest.
3. Vesting is derived from plan records, never from token transfers.
4. Participant PII must not be written to a public blockchain.
5. A reconciliation failure places affected actions on RECONCILIATION_HOLD.
6. TEMPLEBOND, PLEDGEBOND, and NEOTRUST are separate instruments with separate purposes.

## Integrations
- NEO Books: accounting, cap table, valuation and contribution postings.
- NEOpay: participant-facing read/election interface; no unrestricted send for restricted ESOP units.
- NEO Explorer: transaction/document provenance and audit.
- Orange Chip Registry: NEOTRUST-to-underlying-interest mapping.
- NEO Law: plan/trust/fiduciary policy controls.
- NEO Router: authorization and workflow routing.

## Planned API
- GET /api/esop/plan
- GET /api/esop/participants/:id
- POST /api/esop/eligibility/calculate
- POST /api/esop/allocation/run
- POST /api/esop/vesting/calculate
- POST /api/esop/reconcile
- GET /api/esop/reconcile/status
- GET /api/esop/certificate/:id
- GET /api/esop/statement/:id

## Activation gates
Live operation requires, at minimum:
- confirmed plan sponsor/employer;
- adopted governing plan and trust documents;
- verified employer-security class/cap table;
- verified NEOTRUST issuance metadata;
- approved share/token mapping;
- trustee/plan-administrator roles;
- valuation controls;
- production persistence and access controls.
