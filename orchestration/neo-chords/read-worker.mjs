/**
 * Bounded bridge to the existing NEO Platform API read-only command router.
 * Subject must be verified upstream. No new model credentials or scheduler.
 */
export function createChordsReadWorker({ commandRouter, subject, allowedCapabilities = [], parameterPolicy = null } = {}) {
  if (!commandRouter || typeof commandRouter.capabilityStatus !== 'function' || typeof commandRouter.execute !== 'function')
    throw new TypeError('existing_command_router_required');
  if (typeof subject !== 'string' || !subject.trim()) throw new TypeError('authenticated_subject_required');
  if (!Array.isArray(allowedCapabilities) || !allowedCapabilities.every(s => typeof s === 'string' && /^[a-z-]+\.[a-z-]+\.[a-z-]+$/.test(s)))
    throw new TypeError('invalid_capability_allowlist');
  if (parameterPolicy !== null && typeof parameterPolicy !== 'function') throw new TypeError('invalid_parameter_policy');
  const allow = new Set(allowedCapabilities);
  return Object.freeze({
    async run({ capability, parameters = {}, dataClass = 'public' } = {}) {
      if (dataClass !== 'public') throw new Error('external_data_class_denied');
      if (!allow.has(capability)) throw new Error('chords_capability_denied');
      if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw new TypeError('invalid_read_parameters');
      // Never transmit arbitrary mission prompts or parameters without an explicit policy.
      if (parameterPolicy) {
        if (await parameterPolicy({ capability, parameters }) !== true) throw new Error('unapproved_read_parameters');
      } else if (Object.keys(parameters).length) throw new Error('unapproved_read_parameters');
      const status = await commandRouter.capabilityStatus(subject, capability);
      if (status.classification !== 'read' || status.health === 'unavailable') throw new Error('read_capability_unavailable');
      const response = await commandRouter.execute(subject, { capability, parameters });
      if (response?.ok !== true || response?.capability !== capability) throw new Error('invalid_read_worker_response');
      return { capability, provider: response.provider, data: response.data, readOnly: true };
    }
  });
}
