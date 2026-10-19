# NEO Mail Bridge — WordPress adapter
Version 0.1.0. Standalone-first; no IMAP/SMTP secrets or identity signing keys in WordPress.

## Install (after release authorization)
Package this directory as `neo-mail-bridge.zip` with `neo-mail-bridge.php` under one plugin root.
Use WordPress Plugins > Add New > Upload Plugin; activate only after reviewing the site.
The plugin is a **closed-by-default integration placeholder**.

## Endpoints
- GET /wp-json/neo-mail/v1/status: public non-sensitive capability status.
- GET /wp-json/neo-mail/v1/inbox: requires WordPress admin; returns 503 until NEO Pass server-to-server identity exchange is available.

## Production gates
1. Independently verify NEO Pass issuer and signing keys.
2. Have NEO Pass issue dedicated audience `neo-mail`, scope `mail:read`, token_use `mail-access`, expiry <=5 minutes, unique jti and exact mailbox binding.
3. Bind the token to a verified operator on the NEO Mail server; enforce server-side revocation and replay prevention.
4. Authenticate Titan or an alternative explicitly authorized incoming-mail provider; never mix tenant grants.
5. Install in WordPress only after the protected upstream API passes certification.
No passwords in GitHub, plugin settings, logs, or chat. No automatic MX/DNS changes.
