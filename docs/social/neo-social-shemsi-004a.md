# NEO-SOCIAL-SHEMSI-004A — Original Voice Engine Migration

This gate migrates the behavioral core of the uploaded Shemsi Comment Assistant artifact into the production NEO Social implementation.

## Source-preserved behavior

The migrated engine preserves:

- five vibes: Insightful, Supportive, Curious Question, Houston Local, Short & Punchy;
- niche inference from operator-provided tags, then source-caption keywords, then a short caption fallback;
- three response classes per generation: Value-add, Curiosity question, Short punchy;
- the original locked Dr. Lawiy voice profile and tags;
- Houston/HTX and world-temple language patterns;
- the original value-draft 90-character guard;
- customize/copy-compatible response objects;
- the original safety checklist;
- in-session last-10 generation history.

## Production integration

The original artifact was a browser-only drafting tool. NEO Social keeps the creative engine but wraps it in the newer governed workflow:

```
synced or pasted context
 -> original Shemsi voice engine
 -> 3 voice-aligned response options
 -> operator selects one
 -> durable NEO Social draft
 -> explicit approval
 -> authorized publish adapter
 -> platform receipt/readback
```

The original manual-only behavior is therefore preserved as a safe drafting option, while publication remains a distinct, explicit, approval-gated NEO action.

## UI

The production console adds an **Original Voice Engine** panel with:

- locked Dr. Lawiy brand profile;
- niche tags;
- five vibe selectors;
- three generated response cards;
- Use + queue action;
- safety checklist;
- history — last 10.

The existing NEO AI single-draft path remains available beneath the migrated original engine.

## Source provenance

Source artifact supplied by the operator: `shemsi-comment-assistant.html`.

No Meta-hosted fonts, runtime assets, or proprietary service dependency is copied into the NEO production module. The migration preserves the user-supplied artifact's response logic and wording while implementing it in maintainable NEO source.
