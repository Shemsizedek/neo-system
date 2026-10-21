# Project 144 connection checklist

Checked on 21 October 2026. This record separates installed apps, authenticated access, and operational service health.

## Confirmed deployment target

NEOsync selected fresh staging in Render's NEO workspace. The confirmed workspace ID is `tea-db8bbpij9qps73cb7gb0`. Source branch: `neo-system-staging-20261021`. The staging server and release checks were saved in commit `d16dd7937bd87a88f54a2e85fa548df97a6ae433`.

The intended next release is the existing frontend served by the isolated staging server. It requires no production credentials or database. No live Render staging deployment has been created in this session.

## Integration status

| Integration | Installation | Latest verified access | Remaining action |
| --- | --- | --- | --- |
| GitHub | Installed | Authenticated metadata read of `Shemsizedek/neo-system` passed; staging branch and source commit are present | Use the staging branch for the next release |
| Google Drive | Installed | Authenticated account profile read passed | Reconcile the authoritative Project 144 folder and starter package separately |
| Neon | Installed | Project listing passed; four staging projects are visible | Select a project and branch only when a backend needs one; no SQL session or application connection has been verified |
| WordPress.com | Installed | Accessible-site listing found World Temple at `holytemples.org`, site ID `241770410`, with site tools available | Test any requested site operation before reporting that operation working |
| Render | Installed | Workspace and service discovery both failed before returning provider resources | Repair or reauthorize the Render account connection; retry read-only discovery |
| Firebase and Google Cloud | Firebase available but not connected | No Firebase project, Firestore data, Cloud Run runtime, IAM, or Google billing access verified | Complete Firebase installation and account authorization for Firestore work; verify Cloud Run and billing independently |

The current Render failure reports a missing account-connection reference. This is a connector routing failure; it does not establish that Render resources are absent or that the Render service itself is unhealthy. Do not invent that reference or substitute another provider's identity.

## Neon inventory observed

| Project | Provider project ID | Region |
| --- | --- | --- |
| neo-oracle-staging | `autumn-feather-39802278` | `aws-us-west-2` |
| neo-bank-staging | `sweet-dawn-99167630` | `aws-us-west-2` |
| neo-creditstore-staging | `square-sky-44611736` | `aws-us-west-2` |
| neo-deal-desk-staging | `mute-rice-57396659` | `aws-us-west-2` |

These are provider-reported project names. They do not establish a verified mapping to every Project 144 workstream. Public database connections are blocked on the first three projects; preserve those settings. No database settings or data were changed.

## Prioritized next actions

| Priority | Action | Owner | Completion evidence |
| --- | --- | --- | --- |
| P0 | Restore the Render app's account link | NEOsync for account authorization; assistant for verification | Workspace and service discovery succeed for the confirmed NEO workspace |
| P0 | Deploy the isolated frontend staging service | Assistant after Render access works | Exact service ID and deploy ID, terminal live status, matching revision, successful page and asset requests |
| P1 | Connect Firebase for existing Firestore workstreams | NEOsync for installation and authorization; assistant for project verification | Intended account and exact project read successfully; no inference of Cloud Run or billing access |
| P1 | Map future staging backend dependencies | Assistant with verified project and branch identities | Explicit service-to-database mapping and read-only connection test before configuration |

## Decision log

- Use the existing verified integrations; do not reinstall apps that already work.
- Add Firebase for the declared Firestore capability. BigQuery was not substituted for Cloud Run or Firestore administration.
- Keep the fresh Render staging release separate from the existing production recovery work.
- Account access checks do not establish deployment health, user authentication, payments, mining, or other business workflow readiness.
- No app permission defaults, production DNS, databases, spending plans, or financial workflows were changed by this connection audit.

Next milestone: restore Render access, create the fresh staging service from this branch, and verify its returned live URL and deployed revision.
