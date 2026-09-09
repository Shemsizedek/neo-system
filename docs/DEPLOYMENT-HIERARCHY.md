# NEO System Deployment Hierarchy

## Production standard

GitHub `main` is the source of truth.

- Static/public frontend: GitHub Pages
- Authenticated services and APIs: Google Cloud Run
- Structured Temple/GISS registry: Google Cloud Firestore
- CI/CD control: GitHub Actions

Canonical public deployment:

- https://shemsizedek.github.io/neo-system/
- NEO JARVIS: https://shemsizedek.github.io/neo-system/neo-jarvis/

The canonical Pages workflow is `.github/workflows/pages.yml`. Production-facing links, documentation, and health checks should prefer GitHub Pages for static applications and the authorized Cloud Run origin for authenticated backend services.

## Platform rule

Vercel is not part of the active NEO production or fallback architecture. Do not add Vercel deployment configuration, previews, status gates, backend hosting, or failover routing unless an explicit future architecture decision re-enables it.

Cloudflare is likewise not a default application backend. Existing NEO production work should repeat the established GitHub Pages + Google Cloud Run + Firestore pattern rather than introduce another hosting platform.

## Operational rules

1. GitHub Pages deploys static/public applications from `main` through GitHub Actions.
2. Google Cloud Run hosts authenticated NEO services and APIs.
3. Firestore persists structured Temple/GISS registry state.
4. Deployment checks for unused hosting platforms must not block production.
5. New services should reuse this production pattern unless their technical requirements make it unsuitable.
6. Any future hosting-platform change requires an explicit architecture decision before implementation.
