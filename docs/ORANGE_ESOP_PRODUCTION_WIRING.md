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
