# Sacred Records of the Moors Knowledge Graph

## Purpose

This layer turns the source-bound material in *Let's Set The Record Straight!* into a traversable graph for Noogle and NEO Algo.

The graph is designed for questions such as:

- Which people, nations, institutions and symbols does the source connect?
- What chronology does the source claim for a migration, dynasty, conquest or transmission?
- What is the shortest source-claimed path between two concepts?
- Which pages support a specific graph edge?
- Is a connection genealogical, migratory, symbolic, institutional or merely comparative?

## Core node classes

`SOURCE`, `PERSON`, `PEOPLE`, `PLACE`, `INSTITUTION`, `DOCUMENT`, `SYMBOL`, `CONCEPT`, `EVENT`, and `METHOD`.

## Edge discipline

Graph relations intentionally begin with `SOURCE_` when they preserve a claim made by the book. Examples:

- `SOURCE_ASSERTS_ANCESTRY`
- `SOURCE_ASSERTS_DESCENT`
- `SOURCE_ASSERTS_MIGRATION`
- `SOURCE_ASSERTS_INFLUENCE`
- `SOURCE_ASSOCIATES_SYMBOL_WITH`
- `SOURCE_COMPARES_SYMBOL_WITH`

This prevents a graph traversal from silently converting a source claim into an independently established fact.

## Factology workflow

1. Search graph nodes.
2. Traverse neighbors and paths.
3. Inspect the edge evidence status and page references.
4. Separate source statement from independent verification.
5. When verification is requested, build a second evidence layer rather than rewriting the Sacred Record node.

## Symbol controls

The source uses repeated visual comparison: crescents, six-pointed stars, aprons, ankh forms, flags, caduceus imagery and fraternal emblems. NEO Algo treats symbol similarity as an investigative lead. It must not infer organizational identity, succession, membership, ancestry or ownership from resemblance alone.

## Sensitive classifications

The book contains historical racial/genetic classifications. These are preserved only as source material when needed to represent the book faithfully. They may not be converted into automated classifications of real people or used to score human worth, superiority, inferiority, rights, entitlement or eligibility.

## Coverage

Version 1.0 reviews the substantive PDF pages 14–150, including the source introduction, identity/genealogy chapters, Olmec/Nuwbun migration material, Dogon/Hopi/Maya comparisons, Canaanite/Edomite genealogies, Moorish Iberian chronology, Sacred Seal symbolism, Iroquois constitutional-genealogy claims and the final comparative-symbol chapters.

The graph is intentionally extensible: additional nodes and edges can be added as source extracts are normalized or new Sacred Records are supplied.
