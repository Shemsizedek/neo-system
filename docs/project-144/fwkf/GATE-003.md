# FWKF Gate 003 — Team-library evidence handoff and build-certification protocol

**Status:** READINESS TOOLING VERIFIED; REAL ARCHIVE AND TWO FRONTEND BUILDS PENDING  
**Repository:** `Shemsizedek/neo-system`  
**Review branch:** `workstreams/fwkf-gate-002-source-audit`  
**Release authorization:** NONE

## Project team-library status

The project sponsor confirms the recovered ZIP is saved in the Project 144 team library. This statement is recorded as **user-supplied storage status**, not an authenticated tool read. The archived file is **not currently mounted in the execution environment** and was not located through the connected Google Drive search. Google Drive search results do not establish whether ChatGPT Project Files contain a file. We will not ask the sponsor to recreate the archive, assume it is lost, or copy it into the public GitHub repository.

**Expected source name:** `FreeWorld_Chat_Upload.zip`.  
**Previous archive structure:** two React/Vite website projects plus FWKF asset warehouse.  
**Actual ZIP bytes and hashes:** re-verify from team-library attachment when accessible; do not copy old test-environment values from chat notes without readback.

## Verified this gate

- Read-only Gate 002 auditor and synthetic test fetched from the source branch on the connected NEO Linux developer device.
- `python3 -m py_compile` passed on Python 3.13.5.
- `python3 -m unittest discover -s tests -p 'fwkf_source_gate_test.py' -v`: 1/1 passed. The original source ZIP was **not** used.
- Added additional safety regression tests and a GitHub Actions check that runs only synthetic ZIP fixtures, with read-only repository permissions.
- Production website, domain/DNS, and KNOWINDEX production writes remain unchanged.

## Source certification steps, after accessible team-library read

1. Confirm original filename, read the archive bytes through a permitted connector or approved machine, record SHA-256 and ZIP integrity.
2. Run `python3 scripts/fwkf_source_gate.py /secure/path/FreeWorld_Chat_Upload.zip --output /secure/path/fwkf-actual-audit.json`. Keep the generated report private pending sensitive-name review.
3. Inspect `frontend_comparison.shared_different` and both `only_in_*` arrays. Confirm image/content licensing and intended public sections.
4. Select **one canonical frontend** after clean dependency resolution and `npm run build` in separately sandboxed copies. Review actual package scripts before running any archived code. Do not run ZIP-supplied scripts on production hosts.
5. Verify responsive rendering and non-broken links, evaluate SEO/accessibility, and inspect the Python contact API for data handling/CORS/rate limits.
6. Record domains, DNS, TLS, deploy/revert plan, and named approver separately. Staging must be isolated from production and KNOWINDEX write services.

## Acceptance matrix

| Gate | Status | Condition to close |
| --- | --- | --- |
| A: Repository handoff | PASS | Draft PR and scoped branch exist |
| B: Audit tooling | PASS | Source-free synthetic fixture tests executed |
| C: Library ZIP authentication | BLOCKED | Authenticated read and SHA-256 on real ZIP |
| D: Canonical website | BLOCKED | Both candidate builds tested and visually reviewed |
| E: Asset/publication rights | PENDING | Warehouse asset and content permissions verified |
| F: Staging | NOT STARTED | Explicit deployment approval, isolated URL, smoke tests |
| G: Production | NOT AUTHORIZED | Stakeholder review, TLS, backups, monitoring, rollback |

**Decision:** Treat Gate 003 as **partially completed**, not a website certification. Preserve source/permission boundaries and proceed with real archive review only when the Project library makes file bytes accessible.
