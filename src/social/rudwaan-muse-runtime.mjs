// Meta Muse active runtime contract for Rudwaan / Nous OS v0.1
// Muse is treated as a managed compute surface. Nous remains the authority plane.

export const MUSE_RUNTIME = Object.freeze({
  runtimeId: 'NOUS-RUDWAAN-007',
  agentId: 'NIA-013',
  provider: 'meta-muse',
  status: 'user-confirmed-active',
  authorityPlane: 'nous',
  executionPlane: 'meta',
  directApiAccess: 'not_verified',
});

export const MUSE_TASK_CLASSES = Object.freeze({
  research: 'meta',
  multimodal_generation: 'meta',
  instagram_analysis: 'meta',
  business_analysis: 'meta',
  background_task: 'meta',
  canonical_doctrine: 'nous',
  private_knowledge: 'nous',
  approval: 'nous',
  privileged_action: 'nous',
});

export function routeMuseTask(taskClass) {
  const key = String(taskClass || '').trim();
  if (!key) throw new Error('task_class_required');
  return MUSE_TASK_CLASSES[key] ?? 'review';
}

export function buildMuseHandoff({
  taskClass,
  prompt,
  context = {},
  approvalRequired = false,
} = {}) {
  const route = routeMuseTask(taskClass);
  if (route !== 'meta') throw new Error(`muse_not_authorized_for:${taskClass}`);
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('prompt_required');

  return {
    schema: 'neo.meta.muse-handoff.v0.1',
    runtimeId: MUSE_RUNTIME.runtimeId,
    agentId: MUSE_RUNTIME.agentId,
    provider: MUSE_RUNTIME.provider,
    taskClass,
    prompt: prompt.trim(),
    context,
    approvalRequired: Boolean(approvalRequired),
    canonical: false,
    receiptRequiredForCanonicalUse: true,
  };
}

export function acceptMuseResult({result, nousReceipt} = {}) {
  if (!result) throw new Error('result_required');
  return {
    schema: 'neo.meta.muse-result.v0.1',
    runtimeId: MUSE_RUNTIME.runtimeId,
    provider: MUSE_RUNTIME.provider,
    canonical: typeof nousReceipt === 'string' && nousReceipt.trim().length > 0,
    nousReceipt: nousReceipt || null,
    result,
  };
}
