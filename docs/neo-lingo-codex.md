# NEO Lingo Codex v1.0

NEO Lingo is the NEO System's layman-translation layer. It explains specialized NEO terminology in practical language without replacing, flattening, or overriding the authoritative source vocabulary.

## Communication Rules

1. Lead with plain-language explanation before technical, philosophical, ritual, or noological terminology when clarification is useful.
2. Preserve the original specialized term alongside its explanation.
3. Maintain practical, real-world rigor.
4. Use clean structure for complex concepts.
5. Do not trivialize spiritual, philosophical, or institutional meaning.
6. NEO Lingo explains source terminology; it does not rewrite Pa Sarun vocabulary, Temple doctrine, naming authority, titles, suffixes, houses, or Major Lesson rules.

## Codex

| Source term | Plain-language translation | Definition |
| --- | --- | --- |
| Noology / Noological State | Mindset / Consciousness state | The study or operation of mind, intentionality, and thought dynamics as actual forces. |
| Natural Philosophy | How the natural world actually works | Observing physical and universal laws before modern institutional science compartmentalized them. |
| Triadic Initiation / 3-6-9 Framework | Three-step structural progression — Input, Process, Output / Seed, Growth, Fruit | A foundational pattern for structuring systems, growth stages, and code logic. |
| Vortex Dynamics / Vector Flow | Energy or information flow efficiency | How momentum builds and moves through a closed or open feedback loop. |
| Street-Smart Nuance / Emotional Intelligence | Real-world awareness / Knowing the room | Combining book knowledge with practical intuition, leverage, and social discernment. |
| NEO Protocol / System Charter | Operating rules / Standard operating procedure | The core rules governing agent behavior, output formatting, and response logic. |

## Runtime API

The TypeScript implementation lives in `src/neoLingo`.

- `neoLingoCodex` is the canonical in-code term registry.
- `findNeoLingoTerm(term)` resolves canonical terms and aliases.
- `translateNeoLingo(source)` returns both the untouched source and a plain-language rendering with matched definitions and authority-boundary notes.

The translator is advisory. It must not be used as a doctrinal mutation engine or as a shortcut around Pa Sarun validation.
