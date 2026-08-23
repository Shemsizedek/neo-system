# NEO Tribunal v0.9 — Synchronized Operations

## Scope
This milestone connects the Tribunal dashboard to the v0.8 authenticated backend and adds production-oriented deployment and recovery procedures.

## Operations UI
The Tribunal now supports:

- backend health checks;
- user registration and sign-in;
- persistent browser session metadata;
- workspace creation and workspace role display;
- push/pull synchronization of the active case;
- optimistic revision tracking to prevent silent overwrites;
- server-side audit-chain verification.

The browser UI remains a client. Authentication, membership authorization, encrypted case persistence and audit-chain enforcement remain server responsibilities.

## Deployment
The backend can run directly with Node 24:

```bash
export NEO_TRIBUNAL_MASTER_KEY='replace-with-a-long-random-secret'
export NEO_TRIBUNAL_DB='.data/neo-tribunal.sqlite'
npm run tribunal:server
```

Or build the dedicated container:

```bash
docker build -f Dockerfile.tribunal -t neo-tribunal .
docker run --rm -p 8787:8787 \
  -e NEO_TRIBUNAL_MASTER_KEY='replace-with-a-long-random-secret' \
  -v neo-tribunal-data:/app/.data neo-tribunal
```

Never deploy using the placeholder master key in the Dockerfile. The deployment platform should inject a strong secret through its secret-management facility.

## Health monitoring
`GET /health` returns the backend service name and version. Production monitoring should check this endpoint and alert on non-2xx responses or elevated latency.

## Backup
Create a point-in-time database copy with:

```bash
npm run tribunal:backup
```

A custom destination can be passed directly:

```bash
node server/tribunal-backend/backup.mjs /secure/backups/tribunal.sqlite
```

Backups should be encrypted at rest, retained according to institutional records policy, and tested periodically through restore drills.

## Restore
1. Stop the Tribunal backend.
2. Preserve the current database as a forensic copy.
3. Restore the approved backup to the path configured by `NEO_TRIBUNAL_DB`.
4. Start the backend.
5. Authenticate as an authorized reviewer and verify each workspace audit chain.
6. Confirm case revision numbers before resuming writes.

## Security boundary
This system provides internal identity, records, collaboration, encryption, integrity and adjudicative workflow controls. Deployment does not itself confer governmental recognition, police authority, military authority, banking authority or external court jurisdiction.
