# NEO Production Platform Freeze

Effective until an explicit architecture decision changes it:

- GitHub is the source of truth and CI/CD control plane.
- GitHub Pages is the static/public frontend host.
- Google Cloud Run is the authenticated application/API runtime.
- Google Cloud Firestore is the structured Temple/GISS registry.
- Google Cloud Storage may be used for large authorized objects and archives.

Do not introduce or reactivate Vercel as a deployment target, preview environment, fallback, status gate, API host, or production dependency.

Do not introduce a new hosting platform merely to solve a problem already supported by the production stack. Prefer the established path and minimize platform-specific wrappers.

Cloudflare is not a default application backend and its deployment lane is non-blocking unless explicitly re-enabled for a named service.
