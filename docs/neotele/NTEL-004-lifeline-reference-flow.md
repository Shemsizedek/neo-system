# NTEL-004 — Lifeline-inspired NeoTele activation journey

This adapts the *user experience* of established Lifeline eSIM providers, not their government authorization or subscriber benefit.

1. Device check: eSIM-compatible, unlocked phone; compatible carrier; internet/Wi-Fi for installation. Device identifiers are sensitive and must not be logged.
2. Provider selection: present only verified participating providers by ZIP and actual eSIM availability; no inferred free plans.
3. Eligibility referral: applicant uses the official National Verifier or authorized provider flow; do not collect SNAP/Medicaid proof or SSNs in NeoTele until a lawful, secure integration is contracted.
4. Application review: provider and National Verifier determine eligibility, subject to one-benefit-per-household and other program rules.
5. Carrier approval: provider must attest acceptance of a specific application.
6. eSIM delivery: actual carrier issues the eSIM through its supported remote provisioning mechanism; any QR code must come from that authorized provider.
7. Device install: user follows carrier-specific Android or iPhone settings over Wi-Fi. An installation attempt alone is not activation.
8. Activation confirmation: verify network-side activated state before showing ACTIVE.

NeoTele's Chaplaincy membership is organizational and **does not establish Lifeline eligibility**. NeoTele currently is not verified as an FCC-authorized Lifeline service provider or reseller. Government Lifeline support goes through participating eligible telecommunications carriers and approved enrollment processes. Free service, coverage, device eligibility and eSIM availability vary by provider and location.

Official guidance:
- https://www.usac.org/lifeline/national-verifier/how-to-use-nv/
- https://www.usac.org/lifeline/national-verifier/how-to-use-nv/eligibility-check-api/

NTEL-004 commits an unmounted, non-persistent onboarding state machine and security tests. There is no actual Lifeline API connection, profile issuance, carrier approval, live activation or front-end integration yet.

Next NTEL-005: authenticated HTTP adapter, persistent enrolment records, authorized provider directory, plan disclosures, enrollment consent, privacy controls and supervised Chaplaincy pilot.
