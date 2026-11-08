# NEOMAIL-001C acceptance checklist

Do not mark this gate passed until all required items are evidenced.

## Host identity
- [ ] Static public IPv4 assigned.
- [ ] `mailtest.holytemples.org` A record matches that IP.
- [ ] PTR/rDNS points the IP back to `mailtest.holytemples.org`.
- [ ] Forward-confirmed reverse DNS passes.
- [ ] Host provider permits inbound and outbound TCP/25.

## Service
- [ ] Stalwart container healthy.
- [ ] Bootstrap/admin listener reachable only through local/SSH tunnel.
- [ ] HTTPS/JMAP responds on 443.
- [ ] SMTP submission responds on 465 with valid TLS.
- [ ] IMAP responds on 993 with valid TLS.
- [ ] SMTP server-to-server responds on 25.

## Authentication
- [ ] Dedicated staging DKIM selector generated.
- [ ] DKIM public key published.
- [ ] SPF design reviewed without creating a conflicting root SPF record.
- [ ] DMARC alignment verified for staging test mail.
- [ ] TLS certificate valid for `mailtest.holytemples.org`.

## Security
- [ ] Open relay test fails for unauthenticated third-party relay.
- [ ] Rate limiting enabled.
- [ ] Admin MFA enabled where supported.
- [ ] Default/bootstrap credentials rotated.
- [ ] Unused listeners disabled.
- [ ] Secrets/private keys absent from GitHub.

## Delivery tests
- [ ] Outbound test to Gmail delivered.
- [ ] Outbound test to Outlook or another independent provider delivered.
- [ ] Received headers show expected DKIM/SPF/DMARC result.
- [ ] Bounce handling tested.
- [ ] Inbound test to isolated staging mailbox received.
- [ ] Mailbox readable through JMAP or IMAP.

## Resilience
- [ ] Volume snapshot created.
- [ ] Encrypted backup created.
- [ ] Restore performed into a clean instance.
- [ ] Message/event audit record survives restore.

## Production protection
- [ ] Titan MX records still unchanged.
- [ ] Resend still operational as verified outbound safety rail.
- [ ] No production cutover approved solely because staging mail works.

Gate passes only when documentary evidence exists for every required item.
