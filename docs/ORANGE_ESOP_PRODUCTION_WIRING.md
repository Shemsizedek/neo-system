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


## ORANGE-ESOP-012 Deployment Gate
Deployment automation is owned by `.github/workflows/deploy-orange-esop-cloud-run.yml`.

The workflow:
- runs the Orange ESOP contract and application tests;
- authenticates to Google Cloud through Workload Identity Federation;
- ensures role-specific Orange ESOP secrets exist in Google Secret Manager without printing their values;
- grants the Cloud Run runtime identity secret-access permission;
- builds and pushes an immutable Artifact Registry image;
- deploys the `orange-esop` Cloud Run service with Firestore and runtime-only secrets;
- verifies `/health`, `/ready`, and `/api/esop/public-summary` at the Cloud Run origin;
- attaches a serverless NEG/backend to the canonical `neo-edge-url-map`;
- routes `esop.holytemples.org`; and
- verifies the public UI and readiness endpoints before declaring the gate complete.

A deployment is not considered production-verified unless both Cloud Run readiness and the public domain return HTTP 200.
