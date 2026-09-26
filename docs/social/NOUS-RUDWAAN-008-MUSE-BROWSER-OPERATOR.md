# NOUS-RUDWAAN-008 — Muse Browser Operator Bridge

## Operating assumption
The user's Muse access is a personal-use agent surface with its own computer/browser. Direct API access is not assumed.

## Architecture
```
Nous OS / NEOsync
      |
structured browser task
      |
Muse personal computer/browser
      |
human-supervised execution
      |
result + evidence
      |
Nous validation / provenance / approval
```

## Why this model
This uses Muse for what is actually available today: browser/computer-based work. It avoids pretending Muse is a repository-callable API when that has not been verified.

## Supported task classes
- web research
- Instagram native review
- Meta business review
- content research
- visual generation
- browser navigation

## Unsupported from this lane
- financial execution
- credential changes
- private-record disclosure
- destructive operations
- canonical writes
- autonomous publication without approval

## Task contract
`src/social/rudwaan-muse-browser-operator.mjs`

Every task:
- is human supervised
- carries no secret credentials in the payload
- is non-canonical until validated by Nous
- can include requested return fields so Muse returns structured evidence

## Recommended first task
Use Muse's browser to inspect Rudwaan's AI Studio / Instagram management surface and return:
1. available settings
2. connections/integrations
3. whether external apps/tools can be added
4. whether professional Instagram context is visible
5. any automation, task, browser, or action controls exposed
6. screenshots or textual evidence for any relevant control
