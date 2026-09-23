# NEO Automation Control Plane

Status: PROPOSED
Owner: NEOsync / Project 144
Scope: recurring and event-driven automation across the NEO System

## Objective
Use automation for repeatable operational work while keeping the NEO core, websites, treasury, legal authority, and production infrastructure protected from autonomous modification.

## Preferred execution order
1. ChatGPT Tasks / NEOsync for scheduled research, briefs, reminders, recurring drafting, monitoring, and review queues.
2. Connected first-party tools (Gmail, Calendar, Drive, GitHub) for narrowly scoped actions that are explicitly authorized.
3. Polsia only as a secondary autonomous execution channel for low-risk outward-facing work that benefits from 24/7 operation.

## Polsia role
Polsia is NOT the NEO source of truth, deployment authority, webmaster, treasury operator, legal representative, or repository maintainer.

Allowed autonomous Polsia work:
- draft and publish content on Polsia-owned channels;
- operate Polsia-owned landing pages;
- audience growth and lead generation;
- donor/member/sponsor outreach on approved campaigns;
- campaign analytics and market research;
- customer/support responses within approved scripts;
- fundraising support for donations, memberships, sponsorships, grants, events, education, merchandise, and services;
- prepare drafts for Temple Bulletin distribution and other recurring communications.

Denied without explicit human approval:
- edit holytemples.org or any existing NEO production website;
- modify DNS, Cloudflare, domain registrar, email-domain infrastructure, or production hosting;
- merge to protected GitHub branches or deploy production code;
- alter NEO canonical doctrine, policy, naming rules, trust records, legal documents, or governance records;
- access or sign with treasury, wallet, custody, seed, private-key, or privileged production credentials;
- create or materially change securities, private placement, token-sale, bond, note, fund-interest, or investor-eligibility terms;
- send binding legal notices or execute contracts;
- impersonate NEO leadership or make commitments outside approved campaign language.

## Automation classes
### Class A — Fully autonomous
Research, recurring briefs, monitoring, analytics, internal summaries, draft creation, non-binding reminders, and Polsia-owned channel experiments.

### Class B — Autonomous with fixed template
Temple Bulletin distribution, routine public notices, approved event reminders, donor/member follow-up, and recurring social content, provided the automation uses an approved source/template and does not alter canonical facts.

### Class C — Approval required
Publishing to official Holy Temples properties, sending mass email from primary organizational accounts, financial solicitations beyond approved donation/membership language, production deployments, and changes to public organizational claims.

### Class D — Human-only
Treasury signing, wallet custody, irreversible payments, securities-offering execution, legal filings, contracts, DNS/root credentials, trust amendments, and canonical governance changes.

## Temple Bulletin reference workflow
1. NEOsync gathers approved source material.
2. Automation drafts the bulletin.
3. Validation checks names, dates, links, doctrine, claims, and campaign language.
4. If destination is a Polsia-owned channel and content matches an approved template, publish automatically.
5. If destination is an official Holy Temples property or primary mailing list, route to the configured approval rule.
6. Log source inputs, generated output, destination, timestamp, and result.

## Safety controls
- least-privilege credentials;
- separate service accounts where practical;
- no shared root/admin secrets;
- immutable audit records for consequential actions;
- idempotency for recurring jobs;
- rate and spend limits;
- kill switch for every external automation;
- source-of-truth references for canonical content;
- fail closed when authorization, destination, or legal classification is unclear.

## Scheduling registry
Every automation should record:
- automation_id
- name
- owner
- purpose
- trigger/schedule
- execution system
- source of truth
- destinations
- approval class
- spend cap (if any)
- kill switch
- audit destination
- status

## Initial candidates
- Temple Bulletin
- Rune of the Day
- Monday Bitcoin/Counterparty briefing
- Friday NEO recap
- Sunday creator brief
- approved event reminders
- donor/member follow-up
- website uptime monitoring
- broken-link monitoring
- GitHub CI failure monitoring
- Polsia activity digest

No candidate becomes active merely by appearing in this document. A concrete schedule/trigger and destination must be configured before activation.


## Registered automation — Omnitrix Chronicles
- automation_id: neo-social-omnitrix
- name: Omnitrix Chronicles social distribution
- owner: NEOsync / Project 144
- purpose: sourced current-events comic episodes and social distribution
- trigger/schedule: episode-driven; publication requires an approved episode payload
- execution system: NEO Social Gateway
- source of truth: registry/omnitrix-chronicles.yaml
- destinations: Facebook, LinkedIn, X, TikTok, Instagram, YouTube Community
- approval class: B-with-fixed-template
- spend cap: none configured; external paid promotion is out of scope
- kill switch: NEO_SOCIAL_OMNITRIX_ENABLED; fail closed unless exactly true and re-check immediately before routing
- audit destination: audit/social/omnitrix-publication-receipts.ndjson
- status: active after merge and runtime enablement
