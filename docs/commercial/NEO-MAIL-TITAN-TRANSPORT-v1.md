# NEO Mail / Titan Transport v1

Status: active-proposed  
Owner: NIA-013 DEALDESK / NEO Mail

## Purpose

Connect the approved NEO Deal Desk outbound workflow to a real Titan mailbox while preserving the existing executive, compliance, provenance and audit gates.

## Transport

Default hosted Titan settings:

- SMTP: `smtp.titan.email:465` using SSL/TLS.
- IMAP: `imap.titan.email:993` using SSL/TLS.

The adapter intentionally implements the direct TLS path only. If a mailbox uses a regional Titan hostname or a different direct-TLS endpoint, override the host/port through environment configuration.

## Required secret configuration

No mailbox password or app password belongs in Git.

- `NEO_MAIL_USERNAME` — full Titan mailbox address.
- `NEO_MAIL_APP_PASSWORD` — preferred secret when Titan 2FA is enabled.
- `NEO_MAIL_PASSWORD` — fallback secret if an app password is not required.
- `NEO_MAIL_FROM` — From address; defaults to the username.
- `NEO_MAIL_FROM_NAME` — display name; defaults to `NEO Deal Desk`.
- `NEO_MAIL_REPLY_TO` — Reply-To address; defaults to the From address.
- `NEO_MAIL_SMTP_HOST` — defaults to `smtp.titan.email`.
- `NEO_MAIL_SMTP_PORT` — defaults to `465`.
- `NEO_MAIL_IMAP_HOST` — defaults to `imap.titan.email`.
- `NEO_MAIL_IMAP_PORT` — defaults to `993`.
- `NEO_DEAL_DESK_OUTBOUND_ENABLED=true` — final campaign execution switch. It remains off by default.
- `NEO_MAIL_SELF_TEST_ENABLED=true` — separately enables the mailbox-only certification message. It remains off by default.

Store production values in the deployment secret manager, not source control.

## Titan account prerequisites

Third-party client access must be enabled on the Titan mailbox. If Titan two-factor authentication is enabled, use an application password for the NEO Mail transport.

## Verified-recipient gate

A Deal Desk item cannot transmit merely because it was approved.

Before dispatch, an executive administrator must register:

1. a syntactically valid recipient business email; and
2. an HTTP/HTTPS source URL showing where that address was publicly verified.

The outbox records the source URL and verification timestamp. Sent/replied records lock the recipient identity from mutation.

API:

`POST /api/v1/deal-desk/outbox/:id/recipient`

Body:

```json
{
  "email": "public-contact@example.org",
  "sourceUrl": "https://example.org/contact"
}
```

No guessed, generated or inferred private email address satisfies this gate.

## Outbound delivery

Approved items are sent with:

- a unique RFC Message-ID;
- `X-NEO-DealDesk-ID`;
- `X-NEO-Campaign`;
- the configured NEO Mail Reply-To address.

The Titan SMTP acknowledgement is stored on the Deal Desk outbox item and a CRM activity record is created.

## Inbound reply matching

The Titan IMAP reader polls unread messages and examines `In-Reply-To` and `References`.

A response is associated only when one of those fields contains the exact Message-ID stored on a sent Deal Desk item. Matched responses are classified through the existing Deal Desk reply vocabulary and written to CRM activity. Only matched mail is marked seen by the reply worker; unmatched messages remain available for operator review.

Executive polling endpoint:

`POST /api/v1/deal-desk/mail/poll`

This endpoint performs one bounded polling iteration. It does not create an unaudited background identity.

## Health

`GET /health/deal-desk-mail`

Reports sanitized transport readiness only. It never returns mailbox passwords or app passwords.

## Safety boundaries

- Live send remains disabled unless `NEO_DEAL_DESK_OUTBOUND_ENABLED=true`.
- Recipient provenance is required even when live send is enabled.
- Investor/securities items still require the separate compliance approval gate.
- Unmatched inbound mail is not attached to a deal automatically.
- Reply classification is operational triage, not legal or contractual interpretation.
- Provider credentials remain outside source control.


## Production certification self-test

The Render recovery entrypoint auto-loads the Titan SMTP/IMAP adapters from environment configuration. This makes the sanitized mail health endpoint useful even when the GCP-backed GISS production runtime is unavailable.

The executive-only endpoint `POST /api/v1/deal-desk/mail/self-test` remains disabled unless `NEO_MAIL_SELF_TEST_ENABLED=true`.

When enabled, it sends exactly one certification message to the configured Titan mailbox username. It does not accept an arbitrary recipient and does not contact a campaign prospect. Keep `NEO_DEAL_DESK_OUTBOUND_ENABLED=false` during this certification step.
