# NEO System Deployment Hierarchy

## Primary: GitHub Pages

Canonical public deployment:

- https://shemsizedek.github.io/neo-system/
- NEO JARVIS: https://shemsizedek.github.io/neo-system/neo-jarvis/

GitHub `main` is the source of truth. The canonical Pages workflow is `.github/workflows/pages.yml`. Production-facing links, documentation, and health checks should prefer GitHub Pages.

## Backup: Vercel

Vercel is a secondary/fallback deployment target. It must mirror the same built `dist` artifact and `/neo-system/` route structure, but it is not the canonical public endpoint.

Operational rules:

1. GitHub Pages deploys automatically from `main`.
2. Vercel is used for backup availability, recovery testing, and preview/fallback access.
3. A Vercel failure must not block or redefine GitHub Pages as production.
4. Canonical links must point to GitHub Pages unless an incident explicitly triggers failover.
5. `vercel.json` keeps Vercel route-compatible with the GitHub Pages `/neo-system/` base path.
6. Never silently promote Vercel to primary. Failover should be an explicit operational decision.

## NEO JARVIS

Primary:
`https://shemsizedek.github.io/neo-system/neo-jarvis/`

Backup:
Use the active Vercel project URL with `/neo-system/neo-jarvis/` after the Vercel project is connected and healthy.
