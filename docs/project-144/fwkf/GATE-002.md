# Project 144 / Free World Knowledge Foundation — Gate 002

**Status:** SOURCE-AUDIT TOOL COMMITTED; CANONICAL WEBSITE AND LIVE DEPLOYMENT **NOT VERIFIED**  
**Workstream:** FWKF-001 / recovery & web restoration  
**Branch:** \`workstreams/fwkf-gate-002-source-audit\`

## Existing verified NEO linkage

The repository file \`server/crown-metadata/knowindex/METHODOLOGY.md\` says NEO Knowledge is a sponsor-described partnership between Shelton Estate & Co. and the James A. Stanback Family Trust and its Free World Knowledge Foundation. **Executed agreements and governing instruments are not verified.** The KNOWINDEX initiative and World Library are adjacent dependencies, *not* permission to launch a fundraising site, make shareholder claims, expose protected knowledge, or enable ledger writes.

## Received recovery materials (observed in a previous chat session)

The original user-provided local file was called \`FreeWorld_Chat_Upload.zip\` and included the following root folders:

- \`Project_1_freedom_knowledge_institute\` — React/Vite/TypeScript site, Python backend and backups.
- \`Project_2_free-world-knowledge-foundation\` — separate React/Vite/TypeScript site.
- \`Project_3_FWKF_Block_Asset_Warehouse_2026-10-30\` — reference content/visual assets.
- \`FOLDER_MANIFEST.txt\` — inventory of local source folders.

A collaboration package with a file index and a log-excluded copy was prepared in that chat. **The source ZIP and that generated package are not present in this gate's active container**, and no assumption is made that they were added to GitHub/Drive. Therefore neither frontend build nor source equivalence has been certified here.

## Completed

1. Verified connected repository \`Shemsizedek/neo-system\`, and reviewed its KNOWINDEX methodology and existing readiness policy.
2. Created a scoped collaboration branch instead of modifying \`main\` or deploying anything.
3. Added a read-only, Python-stdlib source-audit tool: \`scripts/fwkf_source_gate.py\`.
4. Added a synthetic ZIP test covering cross-project comparison, no extraction, and ZIP path-traversal rejection.

## How to produce a real canonical-source decision

Keep the original ZIP **outside this public repository**. On an authorized workstation:

\`\`\`bash
python3 scripts/fwkf_source_gate.py /secure/path/FreeWorld_Chat_Upload.zip --output /secure/path/fwkf-gate-002-audit.json
python3 -m unittest discover -s tests -p fwkf_source_gate_test.py -v
\`\`\`

Review the report's \`shared_different\`, \`only_in_institute\`, \`only_in_foundation\`, package scripts, warnings, and SHA-256 archive fingerprint. The report contains paths and hashes, **not file contents or credentials**. Do not publish the report or the ZIP until content and filename privacy review is complete.

Then perform both frontend builds in separate clean checkouts / staging worktrees, inspect public content and legal claims, and test backend contact handling without sending live user data.

## Acceptance gates

| Gate | Evidence required | Status |
| --- | --- | --- |
| Source provenance | Archive SHA-256 and inventory tied to owner-provided ZIP | **Pending new-session audit** |
| Canonical frontend | Reviewed per-file comparison + two clean builds + responsive QA | **Blocked by source access** |
| Brand and content | Warehouse asset/license mapping + publication permissions | **Pending** |
| Contact API | No secrets, no local-only endpoint in production, abuse controls and privacy review | **Pending** |
| Integration | Public website linked to NEO Core without bypassing KNOWINDEX access/consent rules | **Pending** |
| Hosting and domain | DNS/hosting ownership, TLS, staging rollback, operator approval | **Not authorized / not verified** |

## Decision record

- **D-002-A** Preserve original project folders; do not overwrite either candidate.
- **D-002-B** Keep all proposed FWKF production surfaces and KNOWINDEX writes disabled until independently verified.
- **D-002-C** Select the canonical frontend only from a reviewed build, not from folder names.
- **D-002-D** Use this public branch for metadata/scripts; do not commit customer submissions, secrets, archives, or internal logs.

**Next milestone:** obtain owner-controlled ZIP through an approved secure path, run the inventory in the same environment, test both React/Vite builds, and record the canonical-source decision.