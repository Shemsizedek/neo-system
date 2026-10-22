import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateRequestBudget } from './request-budget.mjs'

test('accepts ordinary bounded requests', () => {
  assert.equal(evaluateRequestBudget({ objective: 'Explain status', actions: ['summarize'] }).allowed, true)
})

test('rejects excessive input and action count', () => {
  assert.equal(evaluateRequestBudget({ objective: 'x'.repeat(8001) }).reason, 'request_character_budget_exceeded')
  assert.equal(evaluateRequestBudget({ objective: 'ok', actions: Array(21).fill('a') }).reason, 'request_action_budget_exceeded')
})

test('rejects malformed input and invalid configuration', () => {
  assert.equal(evaluateRequestBudget({ objective: null }).reason, 'invalid_budget_input')
  assert.equal(evaluateRequestBudget({ objective: 'ok', actions: [null] }).allowed, false)
  assert.throws(() => evaluateRequestBudget({ objective: 'ok', maxCharacters: 0 }), /invalid_budget_configuration/)
})
