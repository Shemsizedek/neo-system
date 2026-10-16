# NEO Deal Desk Outbound Execution v1

Status: active-proposed  
Owner: NIA-013 DEALDESK

## Purpose

Provide an approval-scoped execution boundary between Deal Desk opportunity preparation and an external mail provider.

## States

- `draft_ready` — generated from sourced commercial prospect intelligence.
- `approval_required` — additional compliance/term review required.
- `approved_to_send` — an executive administrator explicitly approved this exact outbox item.
- `sent` — the configured adapter returned a delivery receipt.
- `send_failed` — adapter execution failed; no success may be inferred.

## Execution controls

A message can leave NEO only when all of these are true:

1. The caller is an authenticated executive administrator.
2. The individual outbox item is approved.
3. Any compliance-required item carries explicit compliance approval.
4. `NEO_DEAL_DESK_OUTBOUND_ENABLED=true`.
5. A configured mail adapter exposes `send()`.
6. The adapter returns a delivery result.

Silence is never approval. Draft generation is never transmission.

## Investor lane

Equity, securities, token/revenue-share or other regulated-investment outreach remains compliance-gated. The commercial approval API must not be interpreted as legal authorization to solicit securities.

## Audit

Successful dispatch creates a NEO CRM `activity` record and an outbox event. Adapter failures create a failed outbox event and leave the item unsent.

## Provider boundary

Provider credentials must stay outside source control. Gmail, NEO Mail/Titan or another approved provider may implement the adapter contract later without changing Deal Desk policy.
