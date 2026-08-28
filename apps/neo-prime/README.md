# NEO Prime

NEO Prime is the canonical operator-facing intelligence and command application for NEOsync OS / ORIGIN.

## Canonical public route

`/neo-system/neo-prime/`

## Core surfaces

- Prime Command operator console
- Persistent browser-local memory and command history
- Voice input and speech output when supported by the browser
- NEO Algo 777 → 888 → 999 reasoning cycle
- 999 → 888 → 777 reverse-review model
- NEO Guard green/yellow/red risk classification
- NEO Router/runtime status
- Platform snapshot health checks
- Optional authenticated HTTPS Runtime Bridge

## Source map

- Frontend: `public/neo-prime/index.html`
- Runtime: `server/neo-prime/runtime.mjs`
- Runtime tests: `server/neo-prime/runtime.test.mjs`
- Reasoning kernel: `core/neo-algo/`
- Platform snapshot: `public/api/platforms/neo-prime.json`

## Runtime boundary

GitHub Pages is the primary static operator surface. Browser-local command, memory, history, voice, status and Guard classification functions can operate directly in the page. Model-backed reasoning, connected tools, provider orchestration, authenticated data access, and external actions require an authenticated HTTPS NEO Prime runtime.

The Runtime Bridge is optional and must not be treated as authorization by itself. Yellow and red actions remain subject to NEO Guard approval requirements.
