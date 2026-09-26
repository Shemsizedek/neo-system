# NEO-SOCIAL-SHEMSI-001 — Comment Assistant Foundation

## Purpose

Shemsi Comment Assistant is the NEO Social engagement layer for preparing replies to comments received on authorized social accounts.

The Meta AI artifact supplied by the operator is treated as a UI/prototype reference. The production implementation does not depend on Meta-hosted fonts, Meta runtime code, or Meta-specific artifact infrastructure.

## Architecture

```
incoming comment
  -> normalize intake
  -> assemble parent-post/comment context
  -> request draft from injected AI runtime
  -> create pending draft
  -> human review/edit
  -> explicit approval
  -> build idempotent reply job
  -> authorized platform adapter
  -> receipt / audit
```

## Contracts

Source: `src/social/shemsi-comment-assistant.mjs`

Schemas introduced:

- `neo.social.shemsi.comment-intake.v0.1`
- `neo.social.shemsi.generation-request.v0.1`
- `neo.social.shemsi.comment-draft.v0.1`
- `neo.social.shemsi.reply-job.v0.1`

Initial platforms:

- Facebook
- Instagram
- LinkedIn
- X
- TikTok
- YouTube

## Controls

This gate is fail-closed.

- AI generation creates drafts only.
- A draft cannot become a reply job without explicit approval.
- Credentials are not embedded in source.
- Provider execution remains runtime-injected.
- Each reply job carries an idempotency key.
- Publication adapters and readback verification are deferred to later gates.

## Meta artifact migration notes

The supplied artifact is a compiled React single-file build. Its black/amber presentation may be used as design inspiration, but production source should use NEO-owned or properly licensed typography and assets.

The original artifact bundle was only partially available in chat, so this gate does not claim byte-for-byte reconstruction of the Meta implementation. Instead it establishes the maintainable production contract the UI will call.

## Verification

Run:

```bash
node --test src/social/shemsi-comment-assistant.test.mjs
```

## Next gate

**NEO-SOCIAL-SHEMSI-002** — add the production UI shell and AI gateway adapter, then connect the draft queue to the existing NEO Social control plane.
