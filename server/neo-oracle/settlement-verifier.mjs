/**
 * NEO Oracle settlement evidence adapter (no payment initiation).
 *
 * Requires TWO independently trusted server-side sources: a merchant invoice
 * repository and a blockchain/Counterparty settlement verifier.
 * Browser redirect parameters, receipts uploaded by a user, and "settled"
 * fields without chain verification never grant paid access.
 */
export function createOracleSettlementVerifier({ lookupEntitlement, verifyChainSettlement, now = () => Date.now(), minimumConfirmations = 6 } = {}) {
  if (typeof lookupEntitlement !== "function" || typeof verifyChainSettlement !== "function") {
    throw new Error("oracle_settlement_sources_required");
  }
  if (!Number.isSafeInteger(minimumConfirmations) || minimumConfirmations < 1) {
    throw new Error("oracle_confirmation_policy_invalid");
  }
  return async function verifySettledEntitlement({ subject, product } = {}) {
    if (typeof subject !== "string" || !subject || product !== "oracle.premium") return { verified: false };
    // Internal merchant system: lookup by validated member subject, not by a
    // payment_id or untrusted order_id supplied from the browser.
    const invoice = await lookupEntitlement({ subject, product });
    if (!invoice || invoice.subject !== subject || invoice.product !== product ||
        invoice.status !== "SETTLED" || invoice.refunded === true || invoice.revoked === true ||
        typeof invoice.paymentId !== "string" || !invoice.paymentId ||
        typeof invoice.chainReference !== "string" || !invoice.chainReference ||
        typeof invoice.rail !== "string" || !["BITCOIN", "COUNTERPARTY"].includes(invoice.rail) ||
        typeof invoice.asset !== "string" || !invoice.asset ||
        typeof invoice.destination !== "string" || !invoice.destination ||
        !Number.isSafeInteger(invoice.amountAtomic) || invoice.amountAtomic <= 0 ||
        !Number.isFinite(invoice.activeUntilMs) || invoice.activeUntilMs <= now()) {
      return { verified: false };
    }
    // Independent authoritative observation must enforce canonical-chain
    // inclusion, correct rail/asset/destination/amount, and reorg policy.
    const observed = await verifyChainSettlement({
      reference: invoice.chainReference,
      rail: invoice.rail,
      asset: invoice.asset,
      destination: invoice.destination,
      amountAtomic: invoice.amountAtomic,
      paymentId: invoice.paymentId,
      minConfirmations: minimumConfirmations
    });
    if (observed?.verified !== true ||
        observed?.reference !== invoice.chainReference ||
        observed?.rail !== invoice.rail ||
        observed?.asset !== invoice.asset ||
        observed?.destination !== invoice.destination ||
        observed?.amountAtomic !== invoice.amountAtomic ||
        !Number.isSafeInteger(observed.confirmations) || observed.confirmations < minimumConfirmations ||
        observed.canonical !== true || observed.reorged === true) return { verified: false };
    return { verified: true, source: "neo-counter", status: "settled",
      subject, product, activeUntilMs: invoice.activeUntilMs };
  };
}
