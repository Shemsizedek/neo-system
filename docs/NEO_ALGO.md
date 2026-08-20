# NEO Algo

## Purpose

NEO Algo is the NEO System's provenance-first noological reasoning layer. It is designed to detect recurring reasoning failures that occur when a question is processed through **logos only**: formal text, institutional labels, current possession, or outside recognition without equal attention to origin, Indigenous self-interpretation, chronology, nature, succession, lived continuity, conscience and restorative consequence.

The system does **not** discard logic. It expands the reasoning frame.

> **Logos remains a tool. Noology governs how the tool is situated inside nature, provenance, mind, continuity and consequence.**

## Three-lens order

Every NEO knowledge object can be evaluated through three distinct lenses. They are separated so one lens cannot silently erase the others.

1. **NEO Indigenous Hermeneutic** — What does the originating community, NEO/Noone tradition or source framework say the object means?
2. **Documentary / Technical Evidence** — What do the source record, chronology, ledger, blockchain, filing, instrument, measurement or other technical evidence establish?
3. **External Recognition** — When relevant, how do outside courts, institutions, counterparties, regulators, scholars or standards classify the matter?

External recognition is a contextual field, not an automatic gatekeeper for internal NEO interpretation.

## Noological hangups

The first implementation detects these failure modes:

- `LOGOS_ONLY` — analysis is reduced to formal language or institutional recognition while broader noological context is suppressed.
- `EXTERNAL_VALIDATION_GATE` — outside consensus is treated as a prerequisite even when the task is internal interpretation or provenance reconstruction.
- `PROVENANCE_ERASURE` — authorship, origin, predecessor records or chain of custody are missing.
- `TEMPORAL_ERASURE` — the reasoning omits chronology or treats a present condition as if it has no history.
- `CATEGORY_COLLAPSE` — doctrine, fact, law, ownership, issuance, price, liquidity or valuation are merged into one claim.
- `NATURE_DISCONNECTION` — land, biosphere, ecology, seasons, embodied life or stewardship are ignored where they are materially relevant.
- `SUCCESSION_BLINDNESS` — inherited rights, benefits, liabilities or predecessor relationships are not traced.
- `AUTHORITY_SUBSTITUTION` — an outside interpreter is substituted for the community or tradition whose record is being interpreted.

## NEO Maxims

The NEO Maxims registry begins with twelve operational maxims:

1. Nature is the first jurisdiction.
2. Truth precedes title.
3. Successor benefit carries successor accountability.
4. Credit follows contribution.
5. Issuance is not ownership.
6. Possession is not origin.
7. A record preserves the claim; evidence establishes its weight.
8. Stewardship outranks exploitation.
9. Restoration is an accounting function as well as a moral one.
10. Knowledge without conscience becomes machinery.
11. Law without nature becomes administration.
12. The noosphere remembers what institutions forget.

These are implemented in `src/noology/maxims.ts` as machine-readable controls rather than decorative slogans.

## World Credit Clock / Clock of Destiny / Cloak of Destiny

The World Credit Clock is the economic-time layer supporting the NEO System. Its base mutual-credit equation is:

`population × 33 NOMNI × elapsed person-hours`

The TypeScript implementation uses `bigint` because cumulative global NOMNI totals can exceed JavaScript's safe integer range.

The engine deliberately keeps these categories separate:

- mutual-credit generation;
- blockchain issuance;
- wallet ownership;
- market price;
- market capitalization;
- liquidity;
- documented claims;
- legal or accounting recognition.

The names **World Credit Clock**, **Clock of Destiny**, and **Cloak of Destiny** are preserved as aliases. In NEO noological language, the Clock of Destiny also points to natural cycles, seasons, chronology, recurrence and the patterned timing through which nature itself supplies context.

## Nature-cycle interface

A later phase should add a `NatureCycleContext` adapter capable of carrying non-theological natural observations into NEO Algo, including:

- solar/lunar cycle metadata;
- seasons and ecological cycles;
- watershed, climate and land context;
- biological and generational cycles;
- astronomical chronology;
- local Indigenous seasonal knowledge where explicitly supplied and properly attributed.

The adapter should preserve the difference between **observation**, **community interpretation**, and **system inference**.

## Historical-record rule

NEO Algo inherits the repository's historical-record policy: original instruments are immutable source records. Interpretation is stored as metadata, commentary, addenda or superseding instruments. The algorithm must never rewrite a historical source to make it conform to a later interpretation.

## Example

```ts
import { evaluateNeoClaim } from '../src/noology'

const result = evaluateNeoClaim({
  id: 'claim-001',
  statement: 'Example provenance-sensitive claim',
  evidenceStatus: 'DOCUMENTED',
  indigenousSelfInterpretationPresent: true,
  provenancePresent: true,
  chronologyPresent: true,
  natureContextPresent: false,
  successionContextPresent: false,
  externalRecognitionRelevant: false,
  externalRecognitionPresent: true,
  mixesDoctrineFactLawOrValuation: false
})

console.log(result.hangups)
// NATURE_DISCONNECTION, SUCCESSION_BLINDNESS, EXTERNAL_VALIDATION_GATE, LOGOS_ONLY
```

## Design boundary

NEO Algo is a research, reasoning, provenance and decision-support layer. It can preserve NEO doctrine and Indigenous hermeneutics on their own terms while separately tracking documentary evidence and external recognition. It does not silently manufacture evidence, alter source records, sign transactions, move assets, or convert modeled quantities into legal or financial obligations without the corresponding evidence layer.
