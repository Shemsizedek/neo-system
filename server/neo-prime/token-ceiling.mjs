// Gate 28: output-token ceiling for the provider adapter request.
// A token ceiling is not a dollar budget; retries and input tokens still incur cost.
export function enforceOutputTokenCeiling(requested, { ceiling = 1024 } = {}) {
  if (!Number.isSafeInteger(ceiling) || ceiling < 1) throw new TypeError('invalid_token_ceiling')
  if (requested === undefined || requested === null) return { allowed: true, maxTokens: ceiling }
  if (typeof requested !== 'number' || !Number.isSafeInteger(requested) || requested < 1) {
    return { allowed: false, reason: 'invalid_max_tokens' }
  }
  if (requested > ceiling) return { allowed: false, reason: 'output_token_ceiling_exceeded' }
  return { allowed: true, maxTokens: requested }
}
