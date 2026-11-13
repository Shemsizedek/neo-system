/**
 * NEO Oracle premium entitlement policy, Project 144.
 *
 * This is a server-side fail-closed boundary, NOT an authentication or payment
 * implementation. Inject only independently trusted, server-side NEOpass and
 * settled-payment verifiers. Never accept user-supplied entitlement assertions.
 */
export function createOraclePremiumGate({ verifyNeopassSession, verifySettledEntitlement, now = () => Date.now() } = {}) {
  return async function authorizePremium({ bearerToken } = {}) {
    if (typeof bearerToken !== "string" || bearerToken.length < 16 || bearerToken.length > 4096) {
      return { ok: false, status: 401, code: "NEOPASS_REQUIRED" };
    }
    if (typeof verifyNeopassSession !== "function" || typeof verifySettledEntitlement !== "function") {
      return { ok: false, status: 503, code: "PREMIUM_NOT_CONFIGURED" };
    }
    let session;
    try {
      // Must check signature / passkey binding / revocation against NEOpass server-side.
      session = await verifyNeopassSession(bearerToken);
    } catch {
      return { ok: false, status: 503, code: "NEOPASS_UNAVAILABLE" };
    }
    const timestamp = now();
    if (!session || session.verified !== true || typeof session.subject !== "string" ||
        session.subject.length < 1 || session.subject.length > 256 ||
        session.audience !== "neo-oracle" ||
        !Array.isArray(session.scopes) || !session.scopes.includes("oracle.execute") ||
        !Number.isFinite(session.expiresAtMs) || session.expiresAtMs <= timestamp) {
      return { ok: false, status: 403, code: "NEOPASS_PREMIUM_DENIED" };
    }
    let entitlement;
    try {
      // Must query trusted billing ledger, reconcile settled NEO Counter invoice,
      // and confirm refunds/revocations before granting access. Do not trust UI state.
      entitlement = await verifySettledEntitlement({ subject: session.subject, product: "oracle.premium" });
    } catch {
      return { ok: false, status: 503, code: "ENTITLEMENT_UNAVAILABLE" };
    }
    if (!entitlement || entitlement.verified !== true ||
        entitlement.source !== "neo-counter" || entitlement.status !== "settled" ||
        entitlement.product !== "oracle.premium" || entitlement.subject !== session.subject ||
        !Number.isFinite(entitlement.activeUntilMs) || entitlement.activeUntilMs <= timestamp) {
      return { ok: false, status: 403, code: "PREMIUM_ENTITLEMENT_DENIED" };
    }
    return { ok: true, status: 200, code: "PREMIUM_AUTHORIZED", subject: session.subject };
  };
}
