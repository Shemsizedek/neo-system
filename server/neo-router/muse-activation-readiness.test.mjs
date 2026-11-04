import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { summarizeMuseActivation, activationMarkdown } from '../../scripts/neo-muse-activation-readiness.mjs'

test('readiness fails closed for missing API key or insufficient GitHub rules', () => {
  for (const arg of [
    { secretConfigured: false, protection: { ok: true, reviews: true, checks: true, activeRulesets: ['NEO'] } },
    { secretConfigured: true, protection: { ok: false, reviews: false, checks: false, activeRulesets: ['NEO'] } },
    { secretConfigured: true, protectionError: true }
  ]) assert.equal(summarizeMuseActivation(arg).status, 'BLOCKED')
})

test('readiness permits only the next live API probe when protections and secret are present', () => {
  const result = summarizeMuseActivation({
    secretConfigured: true,
    protection: { ok: true, reviews: true, checks: true, activeRulesets: ['NEO'] }
  })
  assert.equal(result.status, 'READY_FOR_LIVE_API_PROBE')
  assert.equal(result.liveMuseWrite, 'NOT_TESTED_BY_THIS_WORKFLOW')
  assert.equal(result.externalAppAuthorization, 'NOT_VERIFIED_BY_THIS_WORKFLOW')
  const md = activationMarkdown(result)
  assert.match(md, /read-only/i)
  assert.doesNotMatch(md, /Bearer\s+/)
})

test('read-only workflow does not grant write permissions or execute Muse', () => {
  const yml = readFileSync(new URL('../../.github/workflows/neo-muse-activation-readiness.yml', import.meta.url), 'utf8')
  assert.match(yml, /workflow_dispatch/)
  assert.match(yml, /contents: read/)
  assert.doesNotMatch(yml, /contents: write/)
  assert.doesNotMatch(yml, /pull-requests: write/)
  assert.match(yml, /secrets\.MODEL_API_KEY != ''/)
  assert.doesNotMatch(yml, /uses: anomalyco\/opencode/)
})
