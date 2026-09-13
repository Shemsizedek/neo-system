# NEO Tribunal v1.8 — Service Rules & Deadline Policy Engine

v1.8 introduces configurable service-rule profiles and auditable deadline computation for the World Interfaith Court workflow.

## Capabilities

- Jurisdiction/procedure-scoped rule profiles.
- Calendar-day or business-day deadline calculation.
- Explicit holiday calendars per rule profile.
- SHA-256 rule fingerprints so a deadline record can identify the exact policy configuration used.
- Authority metadata intended to reference NEO Law / Legal Corpus source IDs and pinpoint citations.
- Clerk-controlled recomputation of recipient deadlines with audit events.
- Judge-controlled alternate-service decision records with method, reason, authority metadata and fingerprints.
- Schema v5 persistence and API routes under `/v1/workspaces/:workspaceId/service/`.

## Authority and policy boundary

A rule profile is an operational representation of a cited rule, not proof that the rule governs a dispute. Authority metadata must identify whether a source is internal ecclesiastical/canonical authority, contractual/arbitral authority, or an independently applicable public-law rule. NEOsync may calculate and surface deadlines but must not silently decide jurisdiction, legal sufficiency of service, or authorization for alternate service. Those determinations remain with an authorized human decision-maker under the governing procedure.

## Public court deployment

The intended public portal is `court.holytemples.org`. Public docket access should be branded **Public Access to Court Electronic Records** for the World Interfaith Court, while avoiding any representation that it is the U.S. federal Judiciary's PACER service. The federal PACER name expands to “Public Access to Court Electronic Records”; NEO's implementation is a separate World Interfaith Court service.

World Interfaith Court contact/E-File forms should submit into a dedicated authenticated/public-intake gateway that creates an intake/E-File record in this backend. Do not expose privileged Tribunal APIs or backend bearer tokens in WordPress form markup.
