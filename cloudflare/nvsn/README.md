# NVSN Home Base

Production public home surface for the NEO Virtual Satellite Network.

- Canonical host: `nvsn.holytemples.org`
- Runtime: Cloudflare Workers
- Deployment: `.github/workflows/deploy-nvsn.yml`
- Health: `/health`
- Status API: `/api/status`
- Core protocol implementation: `src/nvsn/`

The Worker is a public status/home surface, not a privileged satellite or RF control plane. Production transmitter, satellite-control, financial custody, and third-party infrastructure integrations require separately authorized adapters.

The Wrangler custom-domain route is intended to provision/bind `nvsn.holytemples.org` through the existing repository Cloudflare credentials. GitHub secrets are never committed to this directory.
