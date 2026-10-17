# NSEC-030 staged gateway readiness controls

Preproduction policy module includes private/no-store response headers, exact-origin/host checking policy and explicit deployment readiness gating. **The module is not yet connected to a production HTTP deployment**, so these tests do not prove the live gateway enforces its rules.

HTTPS/TLS for connect.holytemples.org not independently verified. Real NEO Pass sessions, WebAuthn on Android/Chromebook, shared transactional credential storage and audited revocation require further implementation and testing.

Before any staging deployment, wire policy into the actual gateway and verify trusted proxy host/origin handling; do not trust attacker-supplied Host headers without ingress allowlisting. For state-changing requests also require valid server-issued CSRF tokens and authenticated owner, not Origin alone.

No changes to APK, DNS, Nginx, Cloud Run or Chromebook terminal.
