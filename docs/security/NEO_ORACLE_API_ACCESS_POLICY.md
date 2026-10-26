# Gate 16 — NEO Oracle API Access Policy (Proposed)

**Status:** PROPOSED / review required. **Scope:** `server/neo-prime/server.mjs` and its Render staging deployment. This policy does not itself modify application behavior or authorize production deployment.

## Verified baseline
- `GET /`, `/oracle`, `/oracle/`: public HTML with CSP and other browser security headers.
- `GET /health`, `/healthz`: public status and detailed provider/capability information, 200 or 503.
- `POST /api/prime`, `/prime`, `/api/oracle`: reject disallowed `Origin`, but requests without `Origin` are accepted for processing; CORS is not authentication.
- Commands marked `approvalRequired` require `approved: true`, configured bearer operator token and `x-neo-prime-approval: approved`. Green reasoning can run anonymously under existing tests.
- Existing request JSON limit is 64 KiB. Current tests do not establish rate limits, per-user quotas, or provider spend ceilings.

## Proposed access matrix
| Surface | Intended access | Controls | Approval |
| --- | --- | --- | --- |
| Public HTML | Anonymous read | CSP, security headers, no secrets | none |
| `/healthz` | Anonymous liveness | Minimal boolean/status, no provider inventory | operator approves schema change |
| `/health` | Authenticated diagnostics | Operator or service identity; redact provider internals | operator approves schema change |
| Green reasoning POST | **Decision pending**: authenticated by default; optional explicit sandbox-only public mode | authentication, quota, rate limits, token/cost ceiling, logging redaction | product owner must decide public-mode exception |
| Privileged command POST | Operator identity plus explicit per-action approval | fail-closed risk classification, replay resistance, auditable actor/decision, deny if token absent | authorized human |
| Unknown capabilities/actions | Deny by default | allowlist and negative tests | security review |

## Implementation plan (not deployed)
1. Create an explicit API access-mode configuration with a secure default; retain any public sandbox exception only by reviewed opt-in.
2. Split public liveness and authenticated diagnostics; avoid disclosing provider inventories to unauthenticated clients.
3. Enforce authentication before cost-bearing calls; never treat CORS or user-supplied approval flags alone as authorization.
4. Add per-identity and per-IP abuse limits, bounded concurrency, maxTokens caps, request IDs and secret-safe error responses.
5. Verify risk-classification fail-closed behavior with positive and negative tests; require review before changing existing green-command compatibility.
6. Validate in CI and on staging, then request separate production approval with rollback and monitoring evidence.

## Decision required
**Should anonymous green reasoning be disabled by default?** Recommendation: yes, with any publicly accessible demo separated into a quota-limited sandbox using an explicit operator-approved feature flag. This is a proposal, not an adopted Temple policy.

## Non-goals / boundaries
- No live secret inspection, credential rotation, production service edits, or spending changes.
- No assumption of Temple appointments or production sign-off.
- PR is a draft; merging requires human review.
