# NCC-002 Crown explorer validation

Read-only WordPress integration at `integrations/wordpress/neo-crown-explorer/`.

## Usage
Activate only after review and staging tests. Render `[neo_crown_explorer asset="EXAMPLE"]` with a real, verified canonical asset ID. No WordPress admin credentials or signing keys are required.

## Safety contract
- Only fixed HTTPS host `crown.holytemples.org` is contacted; no user-configurable origin.
- Canonical asset identifiers are restricted and escaped.
- HTTP redirects are disallowed; request timeout and response size are bounded.
- Only public metadata fields are rendered and escaped; no wallet transactions or writes.
- Failure is closed and displays a generic error.
- Public metadata is not proof of asset ownership or issuer identity.

## Manual verification before deployment
1. Run `php -l integrations/wordpress/neo-crown-explorer/neo-crown-explorer.php`.
2. In staging WordPress, test invalid asset, unavailable endpoint, invalid JSON, mismatched asset ID, HTML payload in description, and successful public asset.
3. Verify WordPress shortcode output, outbound HTTPS restrictions, caching and endpoint availability.
4. Review current Crown metadata JSON field names; verify live 200 responses before publishing.
5. Obtain deployment approval, take backup, activate in staging, then roll out with rollback plan.

Status: implementation proposed in PR; no production installation, deployment, or live validation.
