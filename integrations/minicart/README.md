# Neoteric Method / Minicart integration

This integration uses a free split-host architecture:

- Public NEO portal: https://neoteric.holytemples.org
- Free Minicart storefront: https://neotericmethod.minicart.com
- Canonical application/data authority: NEO System Neotherapy service

## Boundary

The NEO-hosted public portal presents Neoteric / Neotherapy information and links users to the Minicart storefront for commerce.

Minicart is not the credential, consent, session, evidence, or research system of record. Participant/session data is not exported by this gate.

## Free-domain mode

The custom-domain feature on Minicart is not required. The `neoteric.holytemples.org` hostname terminates on NEO production infrastructure and links outward to the free Minicart storefront.

This avoids a paid Minicart custom-domain requirement while preserving the branded NEO public hostname.
