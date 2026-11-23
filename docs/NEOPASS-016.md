# NEOPASS-016 — Temple Portal / GISD connection repair

Live inspection found that GISD school links sent users to egov /portal/school, which redirected to a session-expired login. That portal displayed "Google Sign-In is awaiting administrator configuration." The continuity gateway forwards member requests to neo-platform-api-recovery.onrender.com, whose entrypoint starts the generic API without the production Google/Firestore auth service. No production environment variables are configured on the continuity or GISD Sites themselves.

## Published routing repair

The Temple continuity gateway now redirects GET/HEAD /portal/school and /portal/school/ directly to https://gisd.holytemples.org/lms?view=Courses, without calling the unavailable member backend. The public portal includes a school-dashboard entry. Protected writes are not redirected or bypassed. GISD's school/course links remain in its own LMS instead of round-tripping through the disconnected Temple backend.

GISD's NEOpass client callback is updated to https://gisd.holytemples.org/api/neopass/callback. The Node authorization bridge changes in this PR make that callback primary while explicitly retaining the approved legacy Sites callback; token exchange still binds to the exact callback stored on each grant. Node changes are not deployed by this PR.

## Verification and blocker

Continuity build and 7 gateway/navigation/routing tests pass. GISD production build and its PKCE/identity-isolation/revocation test pass. The Node callback suite passes, including canonical-domain and callback-substitution coverage. The existing GISD rendered-HTML test fails in plain Node with ERR_UNSUPPORTED_ESM_URL_SCHEME for cloudflare:workers; live browser page checks are required instead of claiming that test passed.

Full NEOpass/Google SSO remains blocked by the missing production authentication runtime/configuration. The current Render recovery start command does not initialize Google auth or the production GISS authorization bridge. Restoring the real runtime requires its verified Google OAuth client configuration, signing secret and authoritative Firestore access, plus a staged/deployed canonical callback. Do not invent a client ID, rotate secrets, grant broad data access, turn a Sites login into a fabricated NEOpass identity, or expose school records to compensate.

This gate repairs reachable school navigation and prepares callback alignment. It does not certify a successful signed-in NEOpass handoff, transfer a user session between Sites, enroll students or change school roles. Existing GISD platform sign-in and membership checks remain enforced.
