# Integrated Personal Accounts

Status: Proposed Addendum · Chamber: Private Chamber of Shemsizedek  
Canonical subject: `neo:founder:000001` · Updated: 2026-09-21

## Boundary
This file is an **integration map only**. Per `governance/NEO_FOUNDER_ACCOUNT_STANDARD.md`:
- Secrets, tokens, API keys, passwords, recovery codes, wallet keys, and credentials are NEVER stored here.
- Each record maps the canonical founder subject to an external account for display/audit purposes only.
- External services control their own account numbering; a mapping does not claim account precedence there.

Epistemic key: `[to confirm]` = connection exists but details not yet verified by the founder.

## Account records

### Communication & productivity
| Service | Purpose | Data flow | Status |
|---|---|---|---|
| Gmail | Email triage, inbox searches | Inbox metadata + message content to NEOsync on request | KNOWN (connected at onboarding) |
| Google Calendar | Schedule, faith-gathering anchoring | Event data read/write via calendar skill | KNOWN (connected at onboarding) |

### NEO System & development
| Service | Purpose | Data flow | Status |
|---|---|---|---|
| GitHub — `Shemsizedek/neo-system` | Canonical repo; NEO System source | Public; cloned to workspace for read/work | KNOWN |
| ChatGPT | Institutional repo working context | `bootstrap/ai/NEO-SYSTEM-INSTALL.md` bootstrap prompt installed | KNOWN (via install prompt; exact session status [to confirm]) |

### Acting career
| Service | Purpose | Data flow | Status |
|---|---|---|---|
| Casting Networks | Role alerts | Alerts → casting digest [to confirm delivery channel] | [to confirm] |
| Backstage | Role alerts | Alerts → casting digest [to confirm delivery channel] | [to confirm] |

### Business & investing
| Service | Purpose | Data flow | Status |
|---|---|---|---|
| Skool (broker community) | Deal-flow content, SBA-loan community | [to confirm] | [to confirm] |
| TikTok | TikTok Shop interest / content | [to confirm] | [to confirm] |

### Learning & work
| Service | Purpose | Data flow | Status |
|---|---|---|---|
| Coursera | Courses in progress | [to confirm — which courses] | [to confirm] |
| Healthcare-adjacent work tools | [to confirm] | [to confirm] | UNKNOWN |

### Housing
| Service | Purpose | Data flow | Status |
|---|---|---|---|
| SpareRoom | Rental-room hunt | Listing matches → Lawiy [to confirm matching criteria] | [to confirm] |

### Financial [to confirm]
| Service | Purpose | Data flow | Status |
|---|---|---|---|
| Stripe / banking (Plaid skill exists) | [to confirm] | [to confirm] | UNKNOWN |

### Social publishing (verified 2026-09-21 via connector CLIs)
| Service | Account | Purpose | Data flow | Status |
|---|---|---|---|---|
| Instagram | `@shemsizedek` | Personal brand publishing (reels/feed/stories) | Publish + insights via connector | KNOWN |
| Instagram | `@worldtemplist` | Professional account | Publish + insights via connector | KNOWN |
| Instagram | `@trueculturesociety` | Professional account | Publish + insights via connector | KNOWN |
| Threads | `@shemsizedek` (verified) | Short-form text publishing | Publish + insights via connector | KNOWN |
| TikTok | — | Content publishing | No Muse connector exists; audit wall blocks self-built API (personal tools rejected) | UNCONNECTED |
| X | — | Content publishing | No Muse connector yet; vault OAuth viable, pay-per-use billing (~$0.015/post) — decision pending | UNCONNECTED |
| YouTube | @Shemsizedek — H.I.M Dr. Lawiy Zodok (10,240 subs, verified 2026-09-21) | Content publishing | Browser route via `youtube-browser` workspace skill (Google sign-in saved, YouTube Studio verified); direct OAuth blocked by vault domain rule | CONNECTED |

**Multi-account rule:** Instagram returns 3 linked accounts. Content Publisher must ask Lawiy
which account each post is for before drafting; never assume `@shemsizedek`. Publishing still
requires his explicit per-item approval regardless of connection state.

## Verification checklist (next review)
- [ ] Enumerate exact connected services at onboarding (the "dozen+").
- [ ] Confirm casting-alert delivery (manual check vs. automated feed).
- [ ] Confirm Skool, TikTok, Coursera, SpareRoom handles/usernames.
- [ ] Decide: which integrations may write (Calendar yes; others read-only default).

## Write-permissions policy (default)
Read-only on all accounts unless the founder approves a write action per case. Nothing is sent,
posted, purchased, or approved in his name without his explicit yes.
