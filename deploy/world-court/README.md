# World Interfaith Court production gate (v1.9)

This deployment package prepares the NEO Tribunal backend and built web application for `court.holytemples.org` on a Linux host with persistent local storage.

## Why Linux persistent storage

The Tribunal backend currently uses SQLite. Do not deploy the case database to ephemeral Cloud Run filesystem storage. Production deployment requires persistent disk-backed storage until the Tribunal persistence layer is migrated to a managed database.

## Layout

- application checkout: `/opt/neo-system`
- persistent Tribunal data: `/var/lib/neo-world-court/neo-tribunal.sqlite`
- secret environment file: `/etc/neo/world-court.env`
- systemd unit: `neo-world-court.service`
- reverse proxy: Nginx at `court.holytemples.org`

## Activation sequence

1. Install Node.js 24 and Nginx on the authorized Linux host.
2. Create a dedicated `neo` service account and the persistent directories.
3. Clone/update `Shemsizedek/neo-system` into `/opt/neo-system`.
4. Run `npm ci && npm run build`.
5. Copy `world-court.env.example` to `/etc/neo/world-court.env`, replace both placeholder secrets with independent high-entropy values, and restrict the file to the service account/root.
6. Install `neo-world-court.service`, reload systemd, enable and start the service.
7. Install the Nginx server block, validate with `nginx -t`, then reload Nginx.
8. Provision HTTPS for `court.holytemples.org` through the host's approved TLS process before accepting credentials or filings.
9. Verify `https://court.holytemples.org/health` reports Tribunal v1.8 or later and test authenticated Tribunal workflows.
10. Only after the public portal/intake endpoint is verified should the WordPress World Interfaith Court form be changed from its current Jetpack storage path to direct World Court System intake.

## Public records name

The World Interfaith Court public records interface is named **Public Access to Court Electronic Records**. It must be presented as a World Interfaith Court service and not as the United States federal Judiciary's PACER service.

## Security and authority boundary

The World Court System is an institutional court-administration platform. Deployment, records, notices, service data, filings, hearings, and Tribunal outputs do not by themselves establish governmental, compulsory, judicial, police, military, certified-service, or other external authority beyond jurisdiction otherwise established by applicable law, agreement, or recognized ecclesiastical process.
