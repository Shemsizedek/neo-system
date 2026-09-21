# Personal Layer — Index

Status: Proposed Addendum  
Version: 1.0.0  
Chamber: Private Chamber of Shemsizedek  
Canonical subject: `neo:founder:000001` (see `config/identity/founder-account.json`)

## Purpose
The Personal Layer is an **additive, personal-focus extension** of the NEO System for the founder as a
private individual — distinct from the institutional NEO System (NEO-GAS, NEO Algo, Noocracy Papers,
NEO Society, tribunals, trust/family-office material).

## Relationship to the institutional repo
- **Personal layer** = Lawiy the person: identity, accounts, brand, plans. Advisory and organizational only.
- **Institutional layer** = NEO System governance, intelligence, canonical bodies of work. Carries its own
  authority structures and review rules.
- **Personal data here is NEVER institutional authority.** A profile entry does not change canon, confer a
  title, move funds, or authorize a real-world action. Display identity is profile data and MUST NOT be used
  as the authorization key (per `governance/NEO_FOUNDER_ACCOUNT_STANDARD.md`).
- **Secrets are never stored here.** Per the Founder Account Standard, secrets, recovery codes, wallet keys,
  signing keys, biometric templates, and credentials MUST NOT appear in this registry. Only integration
  records (what is connected, why, what data flows) live in `ACCOUNTS.md`.

## Epistemic discipline (from `bootstrap/ai/NEO-SYSTEM-INSTALL.md`)
- Knowledge states: KNOWN / UNKNOWN / UNVERIFIED / DISPUTED / ASSESSED.
- Provenance before repetition. No source → UNKNOWN.
- Never silently convert conversation → verified fact, capability → deployment, plan → commitment.
- Entries the founder has not verified carry `[to confirm]`. Consequential edits require his review.
- Additive development only: this layer extends; it does not rewrite institutional files.

## Contents
| File | Purpose |
|---|---|
| `PROFILE.md` | Personal profile: names, timezone, weekly rhythm, life threads. |
| `ACCOUNTS.md` | Integration map of personal accounts. Records only — no credentials. |
| `BRAND.md` | Personal brand book: identity, positioning, voice, bios, content threads. |
| `PLANS.md` | Personal goals/plans register. Template; seeded only with what is known. |

## Review workflow
1. Draft or propose an entry (agent or founder).
2. Flag `[to confirm]` items for founder review.
3. Founder confirms in conversation → agent promotes entry to KNOWN with provenance note
   (date + source, e.g. "confirmed in chat 2026-09-21").
4. Entries stay uncommitted in the working copy until the founder approves committing/pushing.

## Session initialization response
When NEOsync loads this layer, acknowledge: `Personal Layer: READY (subject neo:founder:000001)`.
