import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const root = new URL('../../', import.meta.url)
const read = path => readFileSync(new URL(path, root), 'utf8')

test('Meta Muse GitHub provider uses an environment-only API key', () => {
  const config = JSON.parse(read('opencode.json'))
  assert.equal(config.model, 'model_api/muse-spark-1.3')
  assert.equal(config.provider.model_api.options.apiKey, '{env:MODEL_API_KEY}')
  assert.equal(config.provider.model_api.options.baseURL, 'https://api.meta.ai/v1')
})

test('owner-gated Muse workflow uses fixed, bounded GitHub permissions', () => {
  const workflow = read('.github/workflows/neo-muse-github-pr-write.yml')
  assert.match(workflow, /github\.event\.comment\.user\.login == 'Shemsizedek'/)
  assert.match(workflow, /github\.event\.issue\.pull_request == null/)
  assert.match(workflow, /startsWith\(github\.event\.comment\.body, '\/oc '\)/)
  assert.match(workflow, /contents: write/)
  assert.match(workflow, /pull-requests: write/)
  assert.doesNotMatch(workflow, /id-token: write\s*$/m)
  assert.match(workflow, /anomalyco\/opencode\/github@[a-f0-9]{40}/)
  assert.match(workflow, /use_github_token: true/)
  assert.match(workflow, /secrets\.MODEL_API_KEY/)
})

test('Muse writer has deny-by-default shell and protected edit paths', () => {
  const policy = read('.opencode/agent/neo-muse-writer.md')
  assert.match(policy, /mode: all/)
  assert.match(policy, /permission:\s*\n  "\*": deny/)
  assert.match(policy, /edit:\s*\n    "\*": allow/)
  for (const path of ['AGENTS.md', 'opencode.json', '.github/*', '.opencode/*', '.git/*']) {
    assert.ok(policy.includes('"' + path + '": deny'), path)
  }
  assert.match(policy, /bash:\s*\n    "\*": deny/)
  assert.doesNotMatch(policy, /^    "npm /m)
  assert.match(policy, /external_directory: deny/)
})

test('repository documents a human review boundary', () => {
  const rules = read('AGENTS.md')
  assert.match(rules, /pull request/i)
  assert.match(rules, /approve\\/merge your own PR/i)
  const owners = read('.github/CODEOWNERS')
  assert.match(owners, /\.github\/workflows\/\* @Shemsizedek/)
})
