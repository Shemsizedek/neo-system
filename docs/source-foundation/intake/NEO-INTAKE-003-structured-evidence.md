# NEO-INTAKE-003 — Structured evidence gate
Date: 2026-11-13
Parent: NEOSYNC-INTAKE-2026-11-13-001
Checkpoint: NEO-INTAKE-002
State: schema-validated, staged, not imported to a live production knowledge database.

## Results
- 27 source-derived claim records preserved, across TX-HB815 (8), UT-METROLOGY (9) and US-CLASS-ACTION (10).
- Six assertions received limited, narrowly scoped source checks; 21 remain without independent adjudication.
- All 27 records passed JSON Schema Draft 2020-12 validation in the generated local handoff package.
- The handoff includes claim-records.json, claim-schema.json, adjudication-rules.json, routing.json, intake-manifest.json, gate-summary.json, README.md.
- Approved for production: zero. A score qualifies only the precise statement actually established by the source; it does not assert entire compound claim is true.

## Source-scoped checks
| Claim | Finding | Source |
| --- | --- | --- |
| UT-METROLOGY C01 | Broad 'no computer has metrology' claim disputed; not established by NIST's IT metrology publication. | https://www.nist.gov/publications/metrology-information-technology-it-0 |
| UT-METROLOGY C02 | NISTIR 6025 authentic, exact interpretation of quoted bit passage still needs full-text review. | https://www.nist.gov/publications/metrology-information-technology-it-0 |
| UT-METROLOGY C08 | Utah HB 76 implementation and pre-July 1, 2026 exemption confirmed by regulator. | https://waterrights.utah.gov/data-centers/ |
| US-CLASS-ACTION C01 | Promoter's website calls initiative 'Evidence & Community Building Phase'; no independent docket determination completed. | https://aneliasutton.com/reparations/ |
| US-CLASS-ACTION C06 | $133,749,114,655,200,000 is a promoter-published estimate, NOT validated damages or judgment. | https://aneliasutton.com/reparations/ |
| US-CLASS-ACTION C07 | Promoter describes prospective 25% administrator fee; not awarded or court approved. | https://aneliasutton.com/reparations/ |

## Evidence policy and routing
SCROLL/NIA-002 captures original provenance and hashes -> ATHENAEUM/NIA-003 evaluates individual claims -> NEO Law / NEO Oracle / NEO Treasury / NEO Market / NEO Algo receive only scoped, read-only derivations -> ORIGIN authorizes any publication or production promotion. Preserve original PDF assessments separately from current evaluations.

## Score and red flags
0 contradicted; 1 materially disputed; 2 unsupported material assertion; 3 plausible/partially backed; 4 narrowly source-backed; 5 supported exactly by authoritative primary source. Null means not evaluated, not false. Do not average into broad truth. Flag bill status inflation, actor inflation, ceiling-as-forecast, headline drift, hypotheses treated as established facts, measurements without units, undocketed lawsuits, estimated damages presented as awarded, marketing promises as legal protection, and undisclosed fees/sponsorship.

## Pending
Texas 90(R) HB 815 primary text and history; scientific full-text checks; independent Infoton benchmarking; class action docket and credentials; exact damages audit; absent companion data-extraction.json files. Original PDFs remain conversation assets, not added to GitHub. Full local ZIP package prepared but NOT deposited into repository by this document.

## Next gate
NEO-INTAKE-004: controlled import into a real persistence target only after mapping actual DB/schema and permissions, and targeted adjudication of highest-impact unknowns. No securities issuance, contact, signing, or externally binding actions.
