/**
 * Normalize existing NEO Bank Bot results before accounting ingestion.
 * An internal runtime 'completed' status is not proof of CES settlement.
 */
export function classifyCesBotReceipt(runtimeResult) {
  if (runtimeResult?.status === 'approval_required') {
    return { disposition: 'approval-required', accountingEligible: false };
  }
  if (runtimeResult?.status !== 'completed') {
    return { disposition: 'not-completed', accountingEligible: false };
  }
  const external = runtimeResult.result;
  if (external?.mode === 'stub' || external?.ok !== true) {
    return { disposition: 'unverified', accountingEligible: false };
  }
  if (!external.legacyReference || !external.evidenceReference) {
    return { disposition: 'awaiting-legacy-evidence', accountingEligible: false };
  }
  return {
    disposition: 'verified-receipt',
    accountingEligible: true,
    legacyReference: String(external.legacyReference),
    evidenceReference: String(external.evidenceReference)
  };
}
