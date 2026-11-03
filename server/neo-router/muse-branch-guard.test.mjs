import test from 'node:test'
import assert from 'node:assert/strict'
import { assessMuseWriteProtection, appliesToMain, inspectMuseWriteProtection } from '../../scripts/neo-muse-branch-guard.mjs'

const rule = (types = ['pull_request', 'required_status_checks'], selection = ['~ALL']) => ({
  id: 7, name: 'NEO - protected main', target: 'branch', enforcement: 'active',
  conditions: { ref_name: { include: selection, exclude: [] } },
  rules: types.map(type => type === 'pull_request'
    ? { type, parameters: { required_approving_review_count: 1, require_code_owner_review: true } }
    : { type, parameters: { required_status_checks: [{ context: 'build' }] } })
})

test('real-world empty active NEO ruleset is insufficient', () => {
  const r = assessMuseWriteProtection([{ id: 20772609, name: 'NEO', target: 'branch', enforcement: 'active', conditions: { ref_name: { include: ['~ALL'], exclude: [] } }, rules: [] }])
  assert.equal(r.ok, false)
  assert.equal(r.reviews, false)
  assert.equal(r.checks, false)
})

test('protected default branch requires code owner approval and CI checks', () => {
  assert.equal(assessMuseWriteProtection([rule()]).ok, true)
  assert.equal(assessMuseWriteProtection([rule(['pull_request'])]).ok, false)
  assert.equal(assessMuseWriteProtection([rule(['required_status_checks'])]).ok, false)
  assert.equal(assessMuseWriteProtection([{ ...rule(), rules: [{ type: 'pull_request', parameters: { required_approving_review_count: 0, require_code_owner_review: false } }] }]).ok, false)
  assert.equal(assessMuseWriteProtection([{ ...rule(), enforcement: 'disabled' }]).ok, false)
})

test('ruleset limited to unrelated branches does not protect main', () => {
  assert.equal(appliesToMain(rule(undefined, ['refs/heads/staging'])), false)
  assert.equal(assessMuseWriteProtection([{ ...rule(), conditions: { ref_name: { include: ['~ALL'], exclude: ['refs/heads/main'] } } }]).ok, false)
})

test('authenticated GitHub ruleset preflight reads details without logging tokens', async () => {
  const called = []
  const fetchImpl = async (url, args) => {
    called.push({ url, auth: args.headers.authorization })
    return {
      ok: true,
      json: async () => url.endsWith('/rulesets/7') ? rule() : [{ id: 7, target: 'branch', enforcement: 'active' }]
    }
  }
  const result = await inspectMuseWriteProtection({ token: 'secret-for-test-only', repo: 'Shemsizedek/neo-system', fetchImpl })
  assert.equal(result.ok, true)
  assert.equal(called.length, 2)
  assert.ok(called[0].url.endsWith('/rulesets?includes_parents=true'))
  assert.ok(called[1].url.endsWith('/rulesets/7'))
})
