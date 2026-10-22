# Project 144 — Gate 08 Controlled Staging Validation

Date: 2026-10-22
Status: INCOMPLETE — read-only verification only.

## Inspected services
| Service | Render deployment | Commit | HTTP response |
| --- | --- | --- | --- |
| neo-core-staging | live | a7aba09fea76d42b31114388792cf082ee66f4ea | Unverified |
| noogle-connect-staging | live | d46bcf22f39295878365769d3381d85e5bf98f7c | Unverified |
| neo-system | update_failed | cb310f922684fe12797bdf81760919bfb6b99886 | Unverified |

## HTTP attempts
- `https://neo-core-staging.onrender.com/`
- `https://noogle-connect-staging.onrender.com/healthz`
- `https://neo-system.onrender.com/`

Browser retrieval reported URLs inaccessible. Independent Python requests from the execution environment failed name resolution. These are verification-environment limitations; they do not prove that endpoints are down.

## Release blockers
1. P0: primary `neo-system` startup command is `Yarn start`, which fails with `Yarn: command not found`; no `start` package script was observed.
2. P0: staging and primary HTTP responses not measured.
3. P1: staging commit is pinned and differs from latest inspected primary commit; parity not established.
4. P1: CI run status, route smoke tests, secrets exposure, rollback and monitoring remain unverified.

## Controlled staging validation protocol
- Preserve current staging and production services.
- Obtain HTTP checks from a network that can resolve Render hosts: capture UTC time, URL, status code, response latency, content-type, redirect chain and sanitized response excerpt.
- Validate frontend shell and critical routes; inspect browser console/network failures; check Noogle /healthz; never paste access tokens or sensitive response bodies.
- Compare staging commit, build command, runtime and environment with intended release candidate.
- Record passing tests and rollback plan before requesting production configuration changes.
- Require explicit authorization for any service edits or deployments.

No changes to Render, production, DNS, credentials or default branch were made.
Next milestone: Gate 09 — verified smoke tests and approval of a narrow recovery change.
