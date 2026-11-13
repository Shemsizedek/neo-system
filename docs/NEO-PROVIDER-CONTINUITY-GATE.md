# Project 144 — independent provider continuity gate

## Direction

NEOsync authorized provider diversity, free-service fallbacks and a mixture of
custom implementations and existing integrations. Keep portable source, standard
interfaces and tested recovery paths. An additional hostname or account on the
same underlying provider is not an independent recovery site.

This gate adds a decision function, not a live traffic router. It does not change
the current production deployment hierarchy or provision providers. Existing
provider restrictions in DEPLOYMENT-HIERARCHY.md remain in force until a reviewed
architecture decision establishes a specific replacement path.

## Verified inventory and limits

Checks on November 8, 2026:

| Component | Evidence | Remaining gap |
| --- | --- | --- |
| Source | Shemsizedek/neo-system accessible with admin/push permissions | Recovery must work without the source host being online |
| NEO SYSTEM Render workspace | tea-dbhtkc8473hc73933img; 13 listed services, including 11 web services reporting plan=free | Configuration is not evidence of runtime health or independent capacity |
| School public URL | https://school.holytemples.org/ returned 200 at 08:20:27 UTC; setup-pending Templist Portal | School identity, learning flow and authentication unverified |
| Prime public health | https://prime.holytemples.org/healthz returned 525 at 08:20:25 UTC | Confirm origin/TLS and independently test the recovery origin |
| Health watch | Existing enabled hourly NEO Angel health watch found | Hourly monitoring is not immediate failover or an uptime guarantee |
| Existing continuity | server/neo-continuity/fabric.mjs and server/neo-router/resilience-continuity.mjs | Existing legacy routing is unchanged; new policy needs trusted runtime wiring |

These observations are a dated baseline, not a claim about current availability.
Rechecks at 00:35:55 UTC on November 9 (6:35 p.m. America/Chicago on November 8)
again returned 525 for Prime and 200 with setup pending for the school.
No independent production fallback, restore result or quota measurement was
verified during this inventory. Provider price/terms and commercial eligibility
must be checked directly before provisioning. Do not evade quotas through extra
accounts or use wake-up requests as a substitute for supported always-on hosting.

## Implemented decision contract

Import buildProviderFailoverDecision from
server/neo-continuity/provider-failover.mjs. It reuses the existing continuity
decision function and returns candidate rejection reasons without performing I/O.

Each candidate supplies id, provider, failureDomains, status, checkedAt,
capabilities, costClass, alwaysOn, quotaUsed and quotaLimit. Failure domains must
include all runtime dependencies relevant to the outage: compute, backing data,
identity, ingress and any shared control plane. Different provider labels alone
do not prove independence. Supply observations from a trusted collector; public
client assertions must never become routing authority.

Defaults require healthy observations no older than five minutes, matching HTTP
capability, explicitly free capacity below 80% of the measured quota, an explicit
always-on capability, and no shared provider or failure domain with the primary.
Quota usage/limit must use the same units and window and represent the tightest
constraint; the trusted collector must refresh quota and capability evidence with
health. Unknown evidence is ineligible. Assess every applicable provider limit
upstream rather than hiding an exhausted limit behind another healthy metric.

For static public recovery pages, callers may explicitly choose alwaysOn=false
and capability='static'. Do not use that setting for authenticated API workers.
Paid capacity is permitted only by explicit policy freeOnly=false; that flag does
not authorize spending. Candidate order sets preference among eligible backups.
A healthy eligible primary stays selected. IndependentBackupReady identifies
whether at least one usable independent backup exists; it does not rebalance load.

Stateful backups also require restoreVerified=true and replicationFresh=true.
Even with preapproval, the function never authorizes automatic stateful promotion.
The caller must enforce single-writer fencing, RPO/RTO, authenticated promotion,
session continuity, idempotency and rollback before switching actual traffic.
The automatic flag is decision metadata for explicitly preapproved stateless
routes; execution remains decision_only.

## Next implementation and acceptance gate

1. Restore and verify Prime origin health; reproduce the school entry flow and
   confirm which application the school hostname serves.
2. Map Core, GISD, NEOpass and Cipher to actual source paths, compute, data,
   identity and ingress owners. Separate static recovery from live application
   continuity. Verify eligible free capacity against current official terms.
3. Choose an independent authorized recovery host and attach trusted health,
   dependency and quota collectors to this decision function in staging.
4. Restore an encrypted backup off-provider and verify integrity and data age.
   Keep signing keys and authentication secrets within approved secret stores.
5. In staging, disable one provider, exhaust a quota, expire health evidence and
   interrupt the data replica. Verify correct rejection/routing, single-writer
   protection, application identity and rollback; record actual RTO/RPO.
6. Release through reviewed deployment controls only after those checks pass.

Rollback for this additive gate is reverting the commit. No production routes,
databases, DNS, provider accounts or billing settings change in this PR.

## Validation

Run: node --test server/neo-continuity/*.test.mjs server/neo-router/resilience-continuity.test.mjs

Synthetic fixtures cover provider/dependency independence, stale/future/malformed
health, quota headroom, sleeping tiers, capability mismatch, stateful recovery,
explicit preapproval, unique identities, no input mutation and legacy continuity.
These tests establish decision behavior only, not deployed failover readiness.
Result: all 27 tests passed on Node v24.22.1; git diff --check also passed.
