# CROWN-GEM-043: Production release gate

Status: STAGING ONLY / PRODUCTION NO-GO.

## Verified in staging
- Authenticated read-only Bitcoin and Counterparty query paths.
- Gemini developer API model generation and tool invocations.
- Request throttling limited to a single application process.
- Structured logs without credentials and with abbreviated route families.

## Mandatory conditions before any public release
1. Centralized/shared quota control across instances, preferably at a trusted ingress proxy; do not trust unvalidated forwarded IP headers.
2. Tamper-evident, durable audit retention outside ephemeral service logs, with bounded retention and access controls.
3. Enforce outbound destination allowlists at the networking layer. DNS checks in Python do not pin a resolved address or prevent DNS rebinding.
4. Independent review of identity, authorization, request size limits, upstream URL/path construction and error handling.
5. Explicit credential lifecycle: rotation, least privilege, incident revocation, no secret logging.
6. Tests for 401, 429, malformed identifiers, upstream timeout and the distinction between data identity matching and independent certification.
7. Complete authorized production change approval with rollback plan, monitoring and alerting.

## Boundaries
- No private treasury or wallet ownership assertions from upstream responses.
- No signing, payments, settlement, broadcasting or transaction execution.
- No claim that a consumer Gemini Gem can directly invoke developer API tools.
- Maintain manual deployments and free staging configuration pending explicit promotion.
