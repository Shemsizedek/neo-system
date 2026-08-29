# NEO Relations control plane

NEO Relations uses the following primary architecture:

- Frontend: GitHub Pages
- Backend source of truth: GitHub repository
- Backend orchestration: GitHub Actions
- Operator/API surface: Discord
- Secrets: GitHub Actions secrets and runtime environment variables only

## Responsibility split

### GitHub Pages

Hosts the browser UI and public-safe status/configuration snapshots. It must never contain bot tokens, webhook URLs, GitHub write tokens, database credentials, signing keys, JWT secrets, or private CRM records.

### GitHub backend

The repository is canonical for schemas, tenant configuration, API contracts, control-plane policy, migrations, release workflows, and audited change history. GitHub Actions performs validation, release gates, backend orchestration, and controlled automation.

GitHub Pages is static and GitHub Actions is ephemeral. Neither is a persistent inbound HTTP server or transactional CRM database.

### Discord server/API plane

Discord is the primary operator-facing server and API/control surface for NEO Relations. Slash commands, interaction responses, channels, webhooks, and event notifications expose the operational interface.

Discord does not execute arbitrary persistent backend code by itself. Discord interactions require a public HTTPS interaction endpoint. Any such endpoint is treated as a thin transport adapter only; NEO Relations business policy, source configuration, and release authority remain GitHub-backed.

## Current security mode

- Read-only Discord relationship/status/approval views are allowed.
- Sensitive CRM mutations are converted into write intents.
- Tenant RBAC and audit policy remain authoritative.
- Discord approval and direct sensitive execution remain disabled.
- AI cannot approve sensitive mutations.
- Execution worker remains disabled.

## Evolution path

1. GitHub remains canonical for NEO Relations code, schemas, policies, tenants, and releases.
2. GitHub Actions validates and publishes backend/control-plane state.
3. Discord remains the primary command/event/API surface.
4. A minimal HTTPS Discord interaction transport may be used where technically required, but it is not the NEO Relations backend.
5. Durable private CRM data must use an appropriate transactional datastore before sensitive production writes are enabled; it must never be exposed through GitHub Pages.
