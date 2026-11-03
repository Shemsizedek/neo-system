# NEO-OSS-004 — CI recovery and private staging preparation
Date: 2026-11-03
Stacked on #1315. No deployment or Blueprint sync performed.

## Implemented repairs
1. Added the existing apps/neo-bank-pages directory to the app inventory.
   The inventory now contains all 23 top-level apps directories at the parent
   revision. No app or architecture enforcement rule was removed.
2. Corrected the GISS integration test to expect Global Interdependent School
   System, the name rendered by the current portal. Its anonymous redirect,
   member-denial, teaching-role and durable course assertions remain intact.
3. Moved NEO Bank publishing-template checks into a separate Node validation
   script. The architecture guard was matching the string in a grep command as
   though the validation workflow deployed Pages. The workflow still runs the
   same template, asset-list, domain-ownership and disabled-financial-write checks.
   The architecture guard and canonical Pages deployment owner are unchanged.
4. Changed the optional Gate 003 live-smoke job to require an isolated self-hosted
   runner labelled neo-crawl4ai-staging. GitHub-hosted runners do not have direct
   access to a Render private service. No runner was registered or live job run.

## Private staging plan
deploy/neo-crawl4ai/private-staging-plan.mjs generates a draft resource definition
only when supplied a digest-pinned GHCR image. It does not create resources.
```bash
node deploy/neo-crawl4ai/private-staging-plan.mjs
```
Without NEO_CRAWL4AI_REVIEWED_IMAGE, it exits 1 with BLOCKED and emits no Blueprint.
There is no invented image digest or mutable default image. With an explicit
reviewed image, it returns a Blueprint draft containing one private image service,
disabled preview stacks, a generated API token and disabled internal-target,
hook and execute-JavaScript flags. The proposed compute plan is 1c-2g, in Oregon,
with one instance; these are planning defaults, not validated runtime sizing.

The output still requires current Render schema/platform validation and image
capability verification before use. Merely matching a digest syntax is not
proof of image provenance. The image must provide the reviewed upstream server,
all runtime dependencies, listening configuration and trusted private TLS.
The current client permits HTTPS or loopback HTTP; it will reject an ordinary
plain-HTTP private hostname. No TLS verification bypass is introduced.

A validation runner must be inside the confirmed NEO SYSTEM workspace/region
private network, isolated from production credentials. The repository's live
workflow must only be dispatched on reviewed trusted code, never untrusted PR
content. The runner label alone is not proof of correct network placement.
An in-service runner or securely administered same-network host is required;
a public endpoint is not a substitute for private connectivity.

## Verification
60 focused local Node tests passed, including four new planner tests.
The extracted publishing-template validation script passed locally against the
actual parent-revision template and site-status files.
GitHub CI on the first repair commit passed the full build/npm test job.
The architecture inventory and route checks passed, then exposed the template
false positive addressed above. Subsequent CI results are reported in the PR.

The real planner invocation returned BLOCKED for the missing reviewed image.
No private service, image, TLS endpoint, runner, token or public crawl was
provisioned. Gate 003 endpoint/token blockers remain until those are connected.
The draft Blueprint is not presented as schema-validated or deploy-ready.

## Current references consulted
The Markdown versions were not readable through the retrieval tool; the official
HTML references and current schema were read instead:
- https://render.com/docs/blueprint-spec
- https://render.com/schema/render.yaml.json
- https://render.com/docs/private-network
- https://render.com/docs/private-services
- https://render.com/docs/compute-plans
- https://render.com/docs/configure-environment-variables
- https://render.com/docs/service-types

Render CLI/platform Blueprint validation was unavailable in this session.
Next release work: confirm CI on the final commit, prepare a reviewed immutable
worker image with private TLS, provision its isolated private service and runner,
bind secrets, and execute Gate 003's one-source smoke and egress validation.
