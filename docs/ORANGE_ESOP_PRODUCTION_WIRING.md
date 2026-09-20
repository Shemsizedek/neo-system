# ORANGE-ESOP-010 — Production Wiring

## Data plane
- Firestore collections: orangeEsopParticipants, orangeEsopStewardship, orangeEsopReconciliation, orangeEsopCertificates, orangeEsopStatements, orangeEsopAudit.
- Participant PII remains off public blockchain.
- NEOTRUST/Bitcoin references belong in audit/provenance fields, not as participant identity.

## NEO adapters
- NEO Books: post contribution, valuation, allocation, forfeiture, and distribution journals.
- NEOpay: expose participant read/election views; do not expose unrestricted Send for restricted ESOP units.
- Orange Chip Registry: verify NEOTRUST metadata and approved mapping.
- NEO Explorer: render TXID/document-hash provenance.
- NEO Law: gate activation against adopted plan/trust records.

## Documents
- RCF-013: participant certificate
- RCF-015: annual ESOP + stewardship statement

## Domain target
Target route: esop.holytemples.org
DNS/custom-domain activation is a separate deployment gate and must point only after Cloud Run health checks pass.

## Authorization
Protected Chaplaincy routes use server-side role credentials supplied only through runtime environment/secrets. The public browser dashboard receives aggregate counts and reconciliation status only; it never receives participant names or private participant records.

Expected runtime secret names:
- ORANGE_ESOP_WORLD_CHAPLAIN_TOKEN
- ORANGE_ESOP_ASSISTANT_GRAND_SHEIK_TOKEN
- ORANGE_ESOP_SECRETARY_TOKEN
- ORANGE_ESOP_TREASURER_TOKEN
- ORANGE_ESOP_PLAN_ADMINISTRATOR_TOKEN
- ORANGE_ESOP_TRUSTEE_TOKEN
- ORANGE_ESOP_AUDITOR_TOKEN

RCF-013 and RCF-015 HTTP issuance remains fail-closed until NEO Books/plan-record adapters supply authoritative allocation, vesting, valuation, reconciliation, and approval data.
