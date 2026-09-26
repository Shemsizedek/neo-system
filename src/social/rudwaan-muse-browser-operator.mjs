// Muse Browser Operator Bridge v0.1
// Treats personal Muse computer/browser access as a human-supervised execution surface.

export const MUSE_BROWSER_OPERATOR = Object.freeze({
  runtimeId: 'NOUS-RUDWAAN-008',
  agentId: 'NIA-013',
  mode: 'operator-side-browser',
  directApi: false,
  humanSupervisionRequired: true,
  canonicalAuthority: 'nous',
});

export const BROWSER_TASK_CLASSES = Object.freeze([
  'web_research',
  'instagram_native_review',
  'meta_business_review',
  'content_research',
  'visual_generation',
  'browser_navigation',
]);

export function buildMuseBrowserTask({
  taskClass,
  objective,
  instructions = [],
  returnFields = [],
  approvalRequired = false,
} = {}) {
  if (!BROWSER_TASK_CLASSES.includes(taskClass)) {
    throw new Error(`unsupported_muse_browser_task:${taskClass}`);
  }
  if (typeof objective !== 'string' || !objective.trim()) throw new Error('objective_required');

  return {
    schema: 'neo.meta.muse-browser-task.v0.1',
    runtimeId: MUSE_BROWSER_OPERATOR.runtimeId,
    agentId: MUSE_BROWSER_OPERATOR.agentId,
    mode: MUSE_BROWSER_OPERATOR.mode,
    taskClass,
    objective: objective.trim(),
    instructions: Array.isArray(instructions) ? instructions : [],
    returnFields: Array.isArray(returnFields) ? returnFields : [],
    approvalRequired: Boolean(approvalRequired),
    canonical: false,
    execution: {
      humanSupervisionRequired: true,
      directApi: false,
      doNotEnterSecretsFromTaskPayload: true,
    },
  };
}

export function acceptMuseBrowserResult({
  task,
  result,
  evidence = [],
  nousReceipt,
} = {}) {
  if (!task?.runtimeId || task.runtimeId !== MUSE_BROWSER_OPERATOR.runtimeId) {
    throw new Error('invalid_muse_browser_task');
  }
  if (!result) throw new Error('result_required');

  return {
    schema: 'neo.meta.muse-browser-result.v0.1',
    runtimeId: MUSE_BROWSER_OPERATOR.runtimeId,
    agentId: MUSE_BROWSER_OPERATOR.agentId,
    result,
    evidence: Array.isArray(evidence) ? evidence : [],
    canonical: typeof nousReceipt === 'string' && nousReceipt.trim().length > 0,
    nousReceipt: nousReceipt || null,
  };
}
