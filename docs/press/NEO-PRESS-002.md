# NEO-PRESS-002 — Private Press Evidence Gateway and Custody Ledger

**State:** CODE STAGED ON FEATURE BRANCH — NO LIVE VAULT, LOGIN, PUBLIC PORTAL, PUBLICATION OR PRODUCTION DATA MIGRATION.

**Depends on:** NEO-PRESS-001 draft PR #1304. This gate intentionally does not replace the legacy Evidence Vault, which serves other NEO modules.

## Security finding and containment

The current legacy Evidence Vault HTTP server in server/neo-evidence-vault/server.mjs permits unauthenticated requests when NEO_EVIDENCE_API_TOKEN is unset, and accepts X-Reviewer as the reviewer identifier. Never direct confidential press evidence to that HTTP service. Do not share the Press Gateway's database path with that server or another reader. This is a demonstrated code-level risk, not an assertion that an attacker accessed any environment.

NEO-PRESS-002 reuses the Evidence Vault's SQLite storage schema via createEvidenceVault but opens a **separate, dedicated database** with fail-closed configuration. It does not enable the existing Evidence Vault HTTP listener or alter its authentication behavior. The dedicated database currently holds **metadata only**, not source names, raw interview material, credential images or the actual media.

SQLite does not supply encryption-at-rest by itself. Production use is **blocked** until the operator establishes a private encrypted storage volume, filesystem permissions, verified backup and restore procedures, service isolation, secure key lifecycle, and a vetted NEOpass press token issuer/registry.

## What has been added

- server/neo-press/custody-store.mjs: dedicated Evidence Vault store with transactional press manifests, generic evidence events, three independent review gates and case-level hash-chained custody events.
- server/neo-press/http.mjs: private-only API handler, **disabled by default**. Requires a valid issuer-signed, time-bound NEOpass bearer with audience neo-press, scope press:case-access and token use neopass-session. It does not trust bearer role claims, x-reviewer or x-neopass-subject headers. It consults the authoritative NEOpass membership service **and a separate server-side press access registry** on every request.
- server/neo-press/custody.test.mjs: denial, privilege, confidentiality, approval, tamper-detection, and no-automatic-publication tests.
- The existing NEO Press Actions workflow tests server/neo-press/*.test.mjs.

## Proposed endpoints (not mounted in a live server)

| Route | Role | Operation |
| --- | --- | --- |
| POST /api/v1/press/cases/:caseId/evidence | press:reporter assigned to case | Register metadata/hash declarations; no original media uploaded |
| POST /api/v1/press/evidence/:id/review | press:editor (ACCURACY), press:privacy (PRIVACY), press:legal (LEGAL_RISK) | Independently attest or reject; reporter cannot self-review |
| GET /api/v1/press/evidence/:id/release-candidate | press:editor assigned to case | Return a minimal candidate after the three independent approvals, no publisher invocation |
| GET /api/v1/press/cases/:caseId/custody | press:auditor or press:editor assigned to case | Read tamper-evident custody events and chain check |

Public access, public media files, credentials, arbitrary source notes, live streaming, case searches, write-through to WordPress, and automatic NEO Social Media Agent posting are **not implemented**.

## Trust model and limitations

- NEOpass is only the identity verifier. Professional newsroom roles and case assignments originate exclusively from the separate press registry, never from a client header or token role value.
- The HTTP handler is not mounted into the NEO Platform API or any public host. The actual press identity provider and a production press registry must be implemented and independently verified before activation.
- Metadata hashes are **declared** by submitters, not independently calculated from original bytes. Claims of source authenticity or media verification are explicitly prohibited until secured original-byte intake and verified digest recomputation exist.
- Hash-chain verification detects in-place modification of retained events, **not** record deletion, privileged database rewriting, or fully reconstructed history. It is not a blockchain timestamp, an independent signature, or evidence of legal admissibility. External attestation/checkpointing and signed backup records remain future work.
- The SHA-256 locator hash can still be sensitive if the locator is guessable; avoid placing identifiable source strings in public outputs. Only approved press roles can read metadata.
- Accuracy, privacy, and legal-risk approvals are distinct, using three different identities, separate from the original reporter. All approval state and custody events are logged. A rejection blocks the release candidate.
- Release candidates are available only through authenticated editor access and return only a small allowlisted summary; publication is always a separate human-governed decision.
- Historical CFAPA press credential remains user-supplied, dated 2015, not independently validated or represented as current; neither credential scan nor name is added to GitHub.

## Acceptance testing and activation prerequisites

Run node --test server/neo-press/*.test.mjs on a current supported Node version, plus existing NEO Evidence Vault regression tests. Confirm no regressions in the NEO Platform API, NeoPass registry, or crawler consumers.

**Do not activate until:**
1. NEO-PRESS-001 baseline is reviewed/merged or this stacked branch is otherwise reconciled;
2. Source vault path and private encryption/backup/security isolation have independent evidence;
3. Press-scoped NEOpass token issuer/audience and authoritative role/case registry are production certified;
4. Legacy Evidence Vault shared-path / unauthenticated-access risk is remediated or independently isolated;
5. Counsel reviews relevant recording/public-records/privilege laws by operating jurisdiction;
6. Signed custody checkpoints, secured original-byte intake, recovery and retention are demonstrated;
7. UI accessibility, security testing, editor workflow and public-safe release controls pass review.

**Next gate — NEO-PRESS-003:** private encrypted media ingestion, hash verification against original bytes, external custody anchoring, production membership certification, and press portal UX behind verified NEOpass. No change to DNS, hosting, existing case evidence or published material is authorized by this draft.
