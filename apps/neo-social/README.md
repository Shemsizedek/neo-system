# Shemsi Comment Assistant

Gate: **NEO-SOCIAL-SHEMSI-001**

Shemsi Comment Assistant is the draft-and-approval layer for comment engagement inside NEO Social.

## Gate 001 scope

- Normalize incoming comments from Facebook, X, LinkedIn, TikTok, and YouTube.
- Build a platform-aware Shemsi reply prompt.
- Generate/hold a reply as a **draft**.
- Require explicit approval before producing a publish request.
- Keep publication transport separate from drafting so existing NEO Social clients can be connected safely.

## Intended pipeline

```
Incoming comment
  -> context normalization
  -> Shemsi prompt
  -> NEO AI gateway / NEOsync generation
  -> draft
  -> human edit / approve / reject
  -> NEO Social dispatcher
  -> platform client
  -> publication receipt
```

## Meta artifact migration

The prototype supplied from Meta AI was a compiled single-file React artifact. NEO does not vendor Meta's Optimistic font files or depend on Meta-hosted assets. The production UI should use the NEO design system and system/local fonts.

The pasted artifact source was truncated, so Gate 001 reconstructs the maintainable application contract first. A complete uploaded HTML artifact can later be used as a visual/interaction reference without making production depend on the compiled Meta bundle.

## Safety invariant

No draft is publishable unless its status is `approved`. `toPublishRequest()` enforces this invariant.
