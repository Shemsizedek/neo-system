# NEO static surfaces, linguistic provenance and Render integration

Status: implementation record | 2026-10-23

## Purpose
This record consolidates engineering decisions from the NEO Lingo/Lexicon, Pa Sarun, NEO Cipher, defensive NEO-GAS, static Pages and hosting conversation. It is an integration specification, not a substitute for running tests, operational approvals, or deployment evidence.

## Canonical module boundaries
- NEO Lingo translates internal vocabulary into practical plain language, while preserving source terminology.
- NEO Lexicon stores structured terms, script/language concepts, aliases and provenance. The First Language source layer contains attributed author claims, **not independently verified linguistic history**. Current GitHub system names belong in the separate system-current source.
- Pa Sarun is an advisory naming auditor. The Holy Shahaddah Ceremony includes the Naturalization Procedure; these are not interchangeable names. Officials exclusively authorize names, title eligibility, earned permanent suffixes and Royal Houses. It has 9 Major Lessons with 144 counted degrees across lessons 1–4, a Profession of Obligation for each counted degree, distinct lesson-language firewalls and human-review escalation. Do not automatically mix major-lesson naming languages or stack expanded ceremonial names into the public formal name.
- NEO Cipher #D/999/144 uses standard authenticated encryption and verified cryptographic randomness. Yamassee is a display/carrier representation, not encryption or additional entropy. Never include licensed font files in the repository without rights.
- Neogram is the public messaging product; NTP is its protocol and NVSN its transport/network layer. NEO Wire and NEO Telegram are legacy/adjacent names, not substitutes for the canonical protocol labels.
- NEO-GAS is defensive intelligence: cyber defense, secure communication, critical-infrastructure resilience, incident analysis, source confidence, humanitarian planning, audit trails and operator review. Disallow autonomous targeting, weapon control, attack execution, offensive intrusion, credential theft, unauthorized surveillance and autonomous force.

## Static delivery architecture
- GitHub remains the source-of-truth repository. Render is the intended runtime/static CDN where an appropriate service has been verified; GitHub Pages can remain a compatibility publishing target until production cutover is validated.
- No Vercel deployment dependency should be introduced.
- Existing `architecture/neo-pages-routes.json` is the canonical Pages manifest. Do not reintroduce `config/pages-routes.json` from the obsolete 2026-08-28 branch.
- Build gate checks the root shell, routes, local assets, static API artifacts, dynamic-side private-surface exclusions, canonical Neogram navigation, SPA fallback and compatibility redirects.
- Every public static JSON API is a **snapshot**. It must never claim real-time ledger, identity, custody or authenticated backend authority.
- Public paths: Neo Hub, Noogle, NEOscan, Neogram, NEOpay, Neo Counter, Neo Prime/Exchange, NEO Lingo, NEO Oracle, Enterprise. Sensitive administrative APIs and member records must remain server-side.

## Rollout gates
1. Branch from latest `main`, do not merge the stale `fix/static-pages-integrity-gate` branch (thousands of commits behind).
2. Run the route and artifact-integrity script after the full current Pages publish sequence; distinguish route-manifest errors from incomplete build artifacts.
3. Render staging must build from the intended branch without historical `git checkout` pinning.
4. Verify deploy state LIVE, base path, route navigation, JSON response types, browser console, TLS and rollback availability.
5. Switch public hostnames only after a healthy verified staging rollout and separately authorized DNS change.
6. Do not automatically merge this feature branch or replace production services on behalf of a staging gate.

## Acceptance criteria
- No public Hub link points to an unpublished messaging route.
- Base-path resolution works both under GitHub project Pages (`/neo-system/`) and Render root (`/`).
- Relative HTML asset links work for nested public routes.
- Internal route aliases are present or redirected, not silently dropped.
- Static integrity checks have explicit failure output; private government workspace data cannot be emitted to public Pages.
- Render staging build is configured from the current source and a successful deploy is verified by service status, not presumed from creation.
