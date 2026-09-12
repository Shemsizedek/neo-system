# Google AI Studio ↔ NEO System Repository Bridge

## Purpose

This contract defines how Google AI Studio may work with `Shemsizedek/neo-system` through the GitHub connection at `https://github-connect.ai.studio/`.

The objective is to let AI Studio inspect NEO System source, propose visual/UI enhancements, and prepare repository changes without bypassing the NEO production gate.

## Canonical repository

- Repository: `Shemsizedek/neo-system`
- Default branch: `main`
- Production changes: branch → validation → pull request → review/approval → merge
- Direct generated changes to `main`: prohibited

## Authorized scope

AI Studio may:

- inspect repository source needed to understand NEO interfaces and visual surfaces;
- propose and implement front-end/UI/UX improvements on a feature branch;
- enhance responsive layouts, accessibility, interaction design, component composition, and visual consistency;
- work with the existing NEO Temple Suite and `neo.holytemples.org` visual bridge;
- add or update non-secret documentation and tests needed to validate those changes;
- prepare a pull request containing a clear summary, validation evidence, affected production surfaces, and rollback notes.

The existing WordPress bridge already exposes governed NEO visual surfaces through `integrations/wordpress/neo-temple-bridge/neo-temple-bridge.php` and the `neo_ai_surface` shortcode.

## Protected boundaries

AI Studio must not:

- read, print, copy, infer, or commit secret values, private keys, wallet seed phrases, OAuth secrets, API keys, operator tokens, or signing material;
- weaken authentication, authorization, NEOpass controls, approval gates, custody boundaries, settlement checks, or production security controls;
- add direct payment execution, signing, custody, payout, transfer, or settlement behavior merely as part of a visual enhancement;
- move production infrastructure away from the established GitHub Actions → Google WIF → Artifact Registry → Cloud Run pattern without a separately approved architecture change;
- replace canonical NEO services with mock, test, placeholder, or substitute production systems;
- silently alter NOMNI valuation logic, CES accounting logic, Counterparty transaction rules, or other financial calculation authority;
- publish generated code directly to production without repository validation and review.

## Branch convention

For AI Studio-generated work, use one of:

- `feat/ai-studio-<surface>`
- `fix/ai-studio-<surface>`
- `chore/ai-studio-<surface>`

Each task must start from current `main` unless a specific existing feature branch is the explicit target.

## Required validation

Before a pull request is considered merge-ready, run the smallest applicable validation set exposed by the affected package/service, including where available:

1. type-check or compile validation;
2. lint/static analysis;
3. unit/integration tests for the changed surface;
4. build validation;
5. security-sensitive regression checks when auth, wallet, financial, or API boundaries are adjacent to the change.

A visual-only change must still prove that it does not alter protected runtime behavior.

## Pull-request handoff

Every AI Studio PR should state:

- what user-facing surface changed;
- why the change improves the NEO experience;
- files changed;
- validation commands and outcomes;
- security/financial boundaries intentionally left unchanged;
- production deployment workflow expected after merge;
- rollback path.

## Production visual bridge

Current NEO Temple Suite integration:

- plugin: `integrations/wordpress/neo-temple-bridge/neo-temple-bridge.php`
- production API: `https://neo.holytemples.org/api`
- bridge asset: `https://neo.holytemples.org/assets/neo-bridge.js`
- suite asset: `https://neo.holytemples.org/assets/neo-suite.js`
- Google AI Studio surface entry: `[neo_ai_surface]`

AI Studio should enhance the underlying components and assets rather than duplicating the WordPress integration with a parallel substitute architecture.

## Gate status

Repository connection alone is not production authorization. The production gate remains GitHub validation plus explicit merge/deployment controls.
