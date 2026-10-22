// Gate 27: conservative, deterministic request-budget preflight.
// Character counts are NOT model token counts; provider enforcement is still required.
export function evaluateRequestBudget({ objective, actions = [], maxCharacters = 8_000, maxActions = 20 } = {}) {
  if (![maxCharacters, maxActions].every(n => Number.isSafeInteger(n) && n > 0)) throw new TypeError('invalid_budget_configuration')
  if (typeof objective !== 'string' || !Array.isArray(actions) || !actions.every(x => typeof x === 'string')) {
    return { allowed: false, reason: 'invalid_budget_input' }
  }
  const characters = objective.length + actions.reduce((sum, action) => sum + action.length, 0)
  if (characters > maxCharacters) return { allowed: false, reason: 'request_character_budget_exceeded' }
  if (actions.length > maxActions) return { allowed: false, reason: 'request_action_budget_exceeded' }
  return { allowed: true, characters, actions: actions.length }
}
