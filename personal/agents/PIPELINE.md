# Content Pipeline — Daily Operating Loop

Status: Proposed · All times America/Chicago · Chamber: Private Chamber of Shemsizedek
Canonical subject: `neo:founder:000001` · Updated: 2026-09-21

The daily loop runs Monday–Friday (weekends lighter: Sunday analyst report; Saturday rest).
Every stage appends new dated files — nothing is overwritten in place.

## Stage 1 — Morning brief · 7:00am CT · ORACLE-STRATEGIST
- **Reads:** `personal/BRAND.md`, `personal/PROFILE.md`, `personal/PLANS.md`,
  `personal/content/published/` (last 14 days), prior briefs.
- **Does:** picks 3 themes + 1 backup, timed to the day (no evening content asks on
  Mon–Thu around the 5pm CT gatherings; faith-rooted angles fit Sunday/Monday;
  deal/operator content fits mid-week).
- **Writes:** `personal/content/briefs/YYYY-MM-DD.md`.
- **Hands off:** brief path → SCRIBE.

## Stage 2 — Drafting · 7:00–8:30am CT · SCRIBE
- **Reads:** the day's brief, `personal/BRAND.md` (voice, do/don't), NEO Lingo codex.
- **Does:** 2 assets per theme (1 TikTok script + 1 text post) = 6 assets/day. Voice:
  direct, warm, no fluff. Claims sourced or marked `[to confirm]`.
- **Writes:** `personal/content/drafts/YYYY-MM-DD-<theme-slug>-<video|post>.md`,
  front-matter: `theme`, `platform`, `pillar`, `status: draft`.
- **Hands off:** draft paths → ALGO-REVIEWER.

## Stage 3 — Review · 8:30–9:00am CT · ALGO-REVIEWER
- **Reads:** each draft, `personal/BRAND.md`, `docs/NEO_ALGO.md` (hangup checks).
- **Does:** voice check, do/don't check, noological hangup scan, claim provenance check.
- **Writes:** appends `## Review — YYYY-MM-DD` block to each draft:
  `verdict: pass | revise | killed` + notes.
- **Hands off:** reviewed drafts → founder queue.

## Stage 4 — Founder approval queue · during the day · Lawiy (in chat)
- NEOsync presents the reviewed drafts to Lawiy in chat (compact: hook + angle per asset,
  full text on request). Lawiy approves, edits, or kills each item.
- **Approval format:** a dated note appended to the draft, e.g.
  `approved by Lawiy in chat 2026-09-21 — publish as-is`.
- Approved items move (copied, not deleted) to `personal/content/approved/`
  with front-matter `status: approved`, `approved_at`.
- **Silence = no.** Unreviewed items expire at midnight; they are never auto-approved.

## Stage 5 — Publish · after approval · PUBLISHER
- **Reads:** `personal/content/approved/` only.
- **Does:** publishes each approved item to its platform; records the post URL.
- **Writes:** `personal/content/published/YYYY-MM-DD-<slug>.md` with
  `published_at`, `platform`, `post_url`.
- **Guard:** any item without a recorded approval is refused and returned to the queue.

## Stage 6 — Analyze + learn · Sunday 8:00am CT · ANALYST
- **Reads:** week's `published/`, prior analyst reports, any engagement data Lawiy shares.
- **Does:** what worked / what didn't (verified data only), pillar scorecard,
  3 recommendations for next week's strategist.
- **Writes:** `personal/content/briefs/weekly/YYYY-MM-DD-analyst.md`.
- **Hands off:** recommendations feed Stage 1 of the next week.

## Evening loop · 7:30pm CT weekdays · engagement triage (drafts only)
- A worker scans for comments/DMs needing replies (platforms as connected) and drafts
  suggested replies into `personal/content/drafts/engagement/YYYY-MM-DD-<thread>.md`.
- **Drafts only — never sends.** Lawiy approves replies in chat; PUBLISHER posts approved ones.

## Directory map
| Stage output | Directory |
|---|---|
| Daily briefs | `personal/content/briefs/` |
| Drafts (+ engagement replies) | `personal/content/drafts/` |
| Approved (awaiting publish) | `personal/content/approved/` |
| Published (with post URLs) | `personal/content/published/` |
| Weekly analyst reports | `personal/content/briefs/weekly/` |

## Failure handling
- Any stage that can't complete marks its output `BLOCKED` with a reason and notifies
  in the next handoff — the loop continues with what's available, never with invented content.
- If the founder hasn't approved anything for 3 days, the strategist reduces output to
  1 theme/day and notes the backlog — no pressure pings beyond the morning brief.
