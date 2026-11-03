import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

function refMatchesMain(ref) {
  return ['~ALL', '~DEFAULT_BRANCH', 'main', 'refs/heads/main', 'refs/heads/*'].includes(ref)
}

export function appliesToMain(ruleset) {
  if (ruleset?.target !== 'branch' || ruleset?.enforcement !== 'active') return false
  const selection = ruleset.conditions?.ref_name
  if (!selection) return true
  const includes = Array.isArray(selection.include) ? selection.include : []
  const excludes = Array.isArray(selection.exclude) ? selection.exclude : []
  if (excludes.some(refMatchesMain)) return false
  return includes.some(refMatchesMain)
}

export function assessMuseWriteProtection(rulesets = []) {
  const applicable = rulesets.filter(appliesToMain)
  const rules = applicable.flatMap(r => Array.isArray(r.rules) ? r.rules : [])
  const reviews = rules.some(r =>
    r.type === 'pull_request' &&
    Number(r.parameters?.required_approving_review_count ?? 0) >= 1 &&
    r.parameters?.require_code_owner_review === true
  )
  const checks = rules.some(r =>
    r.type === 'required_status_checks' &&
    Array.isArray(r.parameters?.required_status_checks) &&
    r.parameters.required_status_checks.length > 0
  )
  return { ok: reviews && checks, activeRulesets: applicable.map(r => r.name), reviews, checks }
}

async function githubJson(path, token, repo, fetchImpl = fetch) {
  const response = await fetchImpl('https://api.github.com/repos/' + repo + path, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: 'Bearer ' + token,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'neo-muse-branch-guard'
    },
    signal: AbortSignal.timeout(10000)
  })
  if (!response.ok) throw new Error('GitHub ruleset verification unavailable (HTTP ' + response.status + ')')
  return response.json()
}

export async function inspectMuseWriteProtection({ token, repo, fetchImpl = fetch } = {}) {
  if (!token) throw new Error('Missing job-scoped GitHub token')
  if (!/^[-A-Za-z0-9_.]+\/[-A-Za-z0-9_.]+$/.test(repo || '')) throw new Error('Invalid GitHub repository')
  const listed = await githubJson('/rulesets?includes_parents=true', token, repo, fetchImpl)
  if (!Array.isArray(listed)) throw new Error('Unexpected GitHub ruleset listing')
  const active = listed.filter(x => x.enforcement === 'active' && x.target === 'branch')
  const details = []
  for (const item of active) {
    if (!Number.isSafeInteger(Number(item.id))) throw new Error('Missing GitHub ruleset ID')
    details.push(await githubJson('/rulesets/' + item.id, token, repo, fetchImpl))
  }
  return assessMuseWriteProtection(details)
}

async function main() {
  const result = await inspectMuseWriteProtection({
    token: process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPOSITORY
  })
  if (!result.ok) {
    console.error('BLOCKED: Muse GitHub writer requires an active main-branch ruleset with ' +
      'one mandatory approval, code-owner review, and at least one required CI check.')
    console.error(JSON.stringify({ reviews: result.reviews, checks: result.checks, rulesets: result.activeRulesets }))
    process.exitCode = 2
    return
  }
  console.log('PASS: GitHub active rulesets enforce main-branch review and required CI checks.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error('BLOCKED: Muse write protection could not be verified: ' + error.message)
    process.exitCode = 2
  })
}
