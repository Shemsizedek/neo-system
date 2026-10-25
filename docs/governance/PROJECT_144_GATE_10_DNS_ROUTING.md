# Project 144 — Gate 10 DNS Authority and Domain Routing

Date: 2026-10-22
Status: Blocked on authoritative DNS read access; no DNS writes.

## Verified
- Canonical NEO hostname is `neo.holytemples.org` per repository README.
- WordPress.com connected sites show `holytemples.org` as the primary domain of World Temple (Atomic).
- Render workspace has NEO staging and primary services; primary web service's last inspected deploy failed because start command `Yarn start` is not available.
- The available WordPress connector exposes DNS update operations but not the required read-only domain-status/details/records operations. Do not write blind.
- Network DNS queries from execution environment fail name resolution for both `holytemples.org` and Render staging host; no public DNS status can be inferred.

## Routing decision
Keep `neo.holytemples.org` as the canonical production app domain. Do not create `neo-core.holytemples.org` unless an authoritative zone review proves a distinct hostname is necessary and target service is verified.

## Required verification
1. Obtain authoritative nameserver and existing A/AAAA/CNAME records for `neo`, plus domain status.
2. Inspect hosting custom-domain association and TLS certificate coverage.
3. Confirm intended app topology and correct startup/build commands.
4. Run external HTTP checks and record status codes, redirects, assets, auth boundary and time.
5. Prepare a reversible change plan; preserve mail and apex records.
6. Require approval before DNS edits, domain mappings or production redeploy.

## Risks
- Blind CNAME edits can hijack or disrupt an existing hostname.
- Pointing DNS to a Render service with failed startup would not restore availability.
- A successful DNS record does not prove a valid TLS certificate or healthy app.

## Gate exit
- [ ] Authoritative DNS evidence
- [ ] Render custom domain and TLS evidence
- [ ] HTTP smoke tests
- [ ] Approved minimal correction if required

No DNS, hosting, production or repository main branch modifications.
