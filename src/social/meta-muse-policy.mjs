// Meta Muse capability policy v0.1
// Keeps Meta as managed compute while Nous remains the authority plane.

export const META_MUSE_POLICY = Object.freeze({
  provider: 'meta',
  agent: 'NIA-013',
  executionPlane: 'meta-managed',
  authorityPlane: 'nous',
  nativeMetaResponsesAreCanonical: false,
  requireNousReceiptForCanonicalUse: true,
  preferredMetaCapabilities: [
    'multimodal_generation',
    'instagram_business_context',
    'background_agent_tasks',
    'business_performance_analysis',
    'web_research',
  ],
  reservedNousCapabilities: [
    'canonical_doctrine',
    'private_knowledge',
    'privileged_action_routing',
    'approval_gates',
    'audit_receipts',
    'provenance',
  ],
});

export function classifyMetaMuseCapability(capability) {
  const value = String(capability || '').trim();
  if (!value) throw new Error('capability_required');
  if (META_MUSE_POLICY.preferredMetaCapabilities.includes(value)) return 'meta';
  if (META_MUSE_POLICY.reservedNousCapabilities.includes(value)) return 'nous';
  return 'review';
}

export function canTreatMetaResultAsCanonical({nousReceipt} = {}) {
  return typeof nousReceipt === 'string' && nousReceipt.trim().length > 0;
}
