# NEO-SYNC-600 — Sacred Chambers integration acceptance gate

Status: validation specification only; no runtime activation or financial action.

## Verified repository inputs
- `src/noology/masterNoologicalDoctrine.ts` imports and registers `sacredChambersDoctrine`.
- `src/noology/sacredChambersDoctrine.ts` defines SCN-001 through SCN-010.
- `docs/GISS_SACRED_CHAMBERS_MODULE.md` defines six learning lanes and assessment standards.
- `data/noology/sacred-chambers-of-nun-registry.md` is the canonical terminology registry.

## Acceptance criteria
1. **NEO Algo**: import the master doctrine in the actual runtime; prove all ten unique SCN IDs can be enumerated and filtered by tags; report module resolution/build result.
2. **NEO Oracle**: execute a read-only retrieval for 'Ninsat', 'NEO-analysis', 'SEBABOND', and 'consent'; include record ID and evidence class in responses. Ninsat must never be presented as an attested ancient term; NEO-analysis must never be represented as clinical diagnosis.
3. **NEOs​ync**: produce a provenance manifest containing source paths, commit SHA, content digests, ingestion timestamp, and version; prove repeat ingestion is idempotent and changes are auditable. Do not synchronize sensitive participant records.
4. **GISS NEO LMS**: confirm actual LMS route/adapter, course availability, permission model, and assessment rendering. Do not mark the module published solely because Markdown exists.
5. **NEO Law / Society**: test SCN-004, SCN-009, SCN-010 against sample prompts; consent must remain voluntary and revocable; distinguish doctrine, historical claims, legal classification, and personal choice.
6. **Finance and Counterparty**: SEBABOND/DOWRYNOTE remain conceptual. No issuance, transfer, token-gated sexual participation, promised yield, or legal enforceability claims without independent review.

## Evidence checklist
- [ ] Runtime consumer path(s) located
- [ ] Typecheck / build and relevant tests pass
- [ ] Oracle retrieval response captures provenance
- [ ] NEOsync idempotency evidence captured
- [ ] LMS course visible to authorized test account
- [ ] Safeguard tests pass
- [ ] Deployment owner and rollback identified

## Release decision
Hold production ingestion/publication until all relevant checks have recorded evidence. This gate does not change DNS, databases, wallets, live curricula, or financial state.
