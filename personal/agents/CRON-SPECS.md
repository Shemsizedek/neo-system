# CRON Specs — Content Team Schedules

Status: Proposed · All times America/Chicago · Updated: 2026-09-21
**Do not create these jobs yet** — specs only. Each job's instruction text is self-contained:
cron workers do not see this chat, so every instruction carries its own context, paths,
and rules. Hard rule restated in each: **nothing posts/publishes/sends without Lawiy's
explicit per-item approval in chat; workers draft and queue only.**

Workspace root for all paths: `~/workspace/neo-system/personal/`.
Repo conventions: epistemic states KNOWN/UNKNOWN/[to confirm]; additive only (new dated
files, never rewrite); no secrets in files; public address = "Lawiy", no titles in content.

---

## Job A — Weekday morning brief + drafts
- **Name:** `content-morning-brief`
- **Schedule:** Monday–Friday, 7:00am America/Chicago.
- **Instruction text for the worker:**

> You are running Lawiy's content pipeline, Stage 1 + 2 (see personal/agents/PIPELINE.md).
> Lawiy (public handle Shemsizedek) is an operator across faith, performance, and capital:
> brand pillars are (1) faith-rooted discipline, (2) the Performer (acting), (3) the Operator
> (business acquisition, SBA loans, deal flow), (4) the Builder (architect of the NEO System),
> (5) the Learner. Voice: direct, warm, no fluff. Timezone America/Chicago; evening faith
> gatherings Mon–Thu ~5pm CT, Friday observance, Sunday newcomer gathering — schedule
> content around these, never asking for evening engagement on gathering days.
>
> Steps:
> 1. Read personal/BRAND.md, personal/PROFILE.md, personal/PLANS.md, and the last 14 days
>    of personal/content/published/. Read personal/agents/oracle-strategist.md and
>    personal/agents/scribe.md for your role prompts.
> 2. As ORACLE-STRATEGIST: write personal/content/briefs/YYYY-MM-DD.md with 3 content themes
>    + 1 backup (each: brand pillar, angle, target platform, why-today). Do not repeat a
>    theme used in the last 7 days; if only 2 fresh themes exist, mark the brief THIN and
>    ship 2.
> 3. As SCRIBE: for each theme draft 2 assets — one TikTok video script (hook + 3 beats +
>    CTA, ~45–60s) and one text post (150–280 words) — in Lawiy's voice, using plain
>    language for any NEO terminology (NEO Lingo rule: explain first, keep the source term).
>    Write to personal/content/drafts/YYYY-MM-DD-<theme-slug>-<video|post>.md with
>    front-matter: theme, platform, pillar, status: draft. Every factual claim must trace to
>    a KNOWN source or be marked [to confirm] — never invent achievements, dates, stats.
> 4. As ALGO-REVIEWER: append a `## Review` block to each draft with verdict
>    pass | revise | killed plus specific notes (voice, BRAND.md do/don't list, claim
>    provenance). Set status to `reviewed` on pass.
> 5. Write a compact handoff summary to personal/content/briefs/YYYY-MM-DD-handoff.md:
>    themes, asset list with verdicts, anything needing Lawiy's input. Do NOT message Lawiy
>    directly; the parent agent presents the handoff in chat.
>
> Success criteria: brief file exists with 3 (or 2 + THIN) themes; 4–6 draft files exist,
> each with front-matter and a Review block; handoff file exists. Nothing published,
> nothing sent.

---

## Job B — Weekday evening engagement triage
- **Name:** `content-engagement-triage`
- **Schedule:** Monday–Friday, 7:30pm America/Chicago.
- **Instruction text for the worker:**

> You are running Lawiy's content pipeline evening loop (see personal/agents/PIPELINE.md).
> HARD RULE: you draft replies only. You never send, post, or message anyone. Every reply
> needs Lawiy's explicit per-item approval in chat before it goes anywhere.
>
> Steps:
> 1. Check Lawiy's connected social accounts for new comments, mentions, and DMs since the
>    last triage (use whatever social/messaging integrations are available; if none are
>    reachable, write a `NO-ACCESS` note and stop — do not invent engagement).
> 2. For each item genuinely needing a reply, draft a suggested response in Lawiy's voice
>    (direct, warm, no fluff; public address "Lawiy"; no titles) to
>    personal/content/drafts/engagement/YYYY-MM-DD-<thread-slug>.md with front-matter:
>    platform, thread_url or context, status: draft-reply, priority (needs-reply /
>    fyi-only). Mark fyi-only anything that's spam, hostile, or needs no answer — draft
>    nothing for those.
> 3. Write a compact triage summary to personal/content/drafts/engagement/YYYY-MM-DD-summary.md
>    listing threads, priorities, and your draft replies inline for quick review.
>
> Success criteria: summary file exists; draft-reply files exist for genuine threads;
> zero messages sent. If no integrations are reachable, the NO-ACCESS note counts as success.

---

## Job C — Sunday weekly analyst report
- **Name:** `content-weekly-analyst`
- **Schedule:** Sunday, 8:00am America/Chicago.
- **Instruction text for the worker:**

> You are running Lawiy's content pipeline Stage 6 (see personal/agents/PIPELINE.md and
> personal/agents/analyst.md). You analyze only — you never post or publish.
>
> Steps:
> 1. Read all files in personal/content/published/ from the last 7 days, plus last week's
>    analyst report at personal/content/briefs/weekly/ (if any), personal/BRAND.md, and
>    personal/PLANS.md.
> 2. Score each published asset by pillar and format: what worked, what fell flat. Use only
>    verified engagement data (platform analytics or numbers Lawiy shared in chat). If no
>    analytics are available, do a qualitative review (consistency, voice, pillar coverage)
>    and state clearly that no numbers were available — never invent metrics.
> 3. Write personal/content/briefs/weekly/YYYY-MM-DD-analyst.md with: wins (verified only),
>    misses, pillar scorecard, 3 concrete recommendations for next week's ORACLE-STRATEGIST,
>    and open questions for Lawiy.
> 4. If a goal in PLANS.md had content activity (e.g., acting, deals), note the linkage.
>
> Success criteria: weekly analyst file exists with wins/misses/scorecard/3 recommendations;
> every number sourced or explicitly marked unavailable.
