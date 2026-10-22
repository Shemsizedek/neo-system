# Project 144 — Gate 04 Governance Register (DRAFT)

Status: Proposed; not ratified. Created 2026-10-22.
Scope: NEO Core and dependent Project 144 workstreams.
This file records responsibilities, not legal appointments or grants of access.

## Decision authority
- Executive Sponsor: **unconfirmed**. Approves strategic priorities, appointments, spending, and material external commitments through documented authority.
- GitHub technical administrator: connected account `Shemsizedek` (GitHub administrative access observed 2026-10-21). This does **not** imply executive appointment.
- Technology Lead: **unassigned**. Owns NEO Core architecture, CI/test evidence, deployment runbooks, rollback and technical security reviews.
- Operations Lead: **unassigned**. Owns project register, backlog, meeting decisions and milestone tracking.
- Finance Lead: **unassigned**. Owns budget proposals, controls and reconciliation; cannot approve spending without delegation.
- Legal/Compliance Reviewer: **unassigned**. Reviews regulated finance, legal claims, privacy and institutional dependencies.
- Division Leads (commerce/media, education/community, real estate/assets): **unassigned**. Own divisional delivery after NEO Core gates.
- AI coordination: prepares analyses, drafts and authorized changes; no independent legal, financial or production authority.

## RACI-style control rules
1. One named accountable human owner per deliverable before implementation.
2. Repository admin privileges are technical permissions, not proof of corporate authority.
3. No production deployments without test results, security review, approval and rollback plan.
4. No spending, sensitive disclosures, legal commitments or regulated financial launch without authorized human approval.
5. Keep sandbox/simulation features clearly separated from live institutional services.

## Project register
| Workstream | Accountable owner | State | Dependency | Next evidence |
| --- | --- | --- | --- | --- |
| NEO Core | Unassigned | Repository identified; deployment unverified | Technical lead | Architecture inventory and CI results |
| Executive governance | Unassigned | Draft | Sponsor appointment | Signed/recorded approval |
| Finance and compliance | Unassigned | Review required | Legal/finance delegates | Risk and approval matrix |
| Commerce and media | Unassigned | Not audited | NEO Core | Product inventory |
| Education and community | Unassigned | Not audited | NEO Core | Program inventory |
| Real estate and assets | Unassigned | Not audited | Governance | Asset inventory |

## Architecture and integration inventory
- Canonical source: `Shemsizedek/neo-system`, default branch `main` (verified via connected GitHub).
- README describes NEOsync Executive Office, Noogle/Omnitrix, treasury sandbox and related modules.
- `package.json` contains build/test scripts; execution results **not yet verified**.
- Hosted environment, secrets, backup, monitoring, CI and production deployment status: **not verified**.

## Decision log
| Date | Decision | Status |
| --- | --- | --- |
| 2026-10-21 | Prioritize leadership roles and accountability | User-directed |
| 2026-10-22 | Draft governance controls on a separate branch | Implemented; pending review |
| Pending | Confirm whether Shemsizedek is sponsor or technical administrator only | Unresolved |

## Gate 04 acceptance criteria
- [ ] Sponsor and interim owners explicitly appointed
- [ ] Technical access matrix reviewed
- [ ] Build and test evidence captured
- [ ] Deployment, monitoring, backup and rollback checked
- [ ] Governance register approved and merged

## Next milestone
Gate 05: NEO Core technical audit and controlled release readiness. Do not mark operational without evidence.
