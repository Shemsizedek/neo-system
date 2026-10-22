// Gate 29: normalize reported usage, without estimating or inventing tokens.
// Unknown usage stays null; this is not billing or spend enforcement.
function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null
}
export function normalizeProviderUsage(provider, raw) {
  const usage = raw?.usage ?? raw?.usageMetadata ?? null
  const input = nonnegativeInteger(usage?.input_tokens ?? usage?.prompt_tokens ?? usage?.promptTokenCount)
  const output = nonnegativeInteger(usage?.output_tokens ?? usage?.completion_tokens ?? usage?.candidatesTokenCount)
  const total = nonnegativeInteger(usage?.total_tokens ?? usage?.totalTokenCount)
  return {
    provider: typeof provider === 'string' ? provider : 'unknown',
    inputTokens: input,
    outputTokens: output,
    totalTokens: total,
    reported: input !== null || output !== null || total !== null,
  }
}
