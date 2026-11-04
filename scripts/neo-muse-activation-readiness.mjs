import { appendFile } from 'node:fs/promises'
import { inspectMuseWriteProtection } from './neo-muse-branch-guard.mjs'

export function summarizeMuseActivation({ secretConfigured = false, protection, protectionError } = {}) {
  const rulesVerified = protection?.ok === true && !protectionError
  const checks = [
    { name: 'Meta Model API secret configured', ok: secretConfigured === true },
    { name: 'Main branch protection: code-owner PR approval', ok: protection?.reviews === true && !protectionError },
    { name: 'Main branch protection: required CI checks', ok: protection?.checks === true && !protectionError }
  ]
  return {
    status: checks.every(check => check.ok) ? 'READY_FOR_LIVE_API_PROBE' : 'BLOCKED',
    checks,
    rulesetNames: protection?.activeRulesets ?? [],
    protectionError: protectionError ? 'Ruleset verification unavailable' : null,
    externalAppAuthorization: 'NOT_VERIFIED_BY_THIS_WORKFLOW',
    liveMuseWrite: 'NOT_TESTED_BY_THIS_WORKFLOW',
    actionsCreatePullRequests: 'CHECK_IN_GITHUB_SETTINGS'
  }
}

export function activationMarkdown(report) {
  const lines = [
    '## NEO Muse GitHub activation preflight',
    '',
    '**Status:** ' + report.status,
    '',
    ...report.checks.map(check => '- ' + (check.ok ? 'PASS' : 'BLOCK') + ': ' + check.name),
    '',
    '- Rulesets inspected: ' + (report.rulesetNames.join(', ') || 'none confirmed'),
    '- External Meta Muse GitHub App authorization: ' + report.externalAppAuthorization,
    '- GitHub Actions permission to create PRs: ' + report.actionsCreatePullRequests,
    '- Authenticated Muse Code write: ' + report.liveMuseWrite,
    '',
    'This is read-only. It does not invoke Meta AI, open pull requests, or alter GitHub permissions.'
  ]
  if (report.protectionError) lines.push('Ruleset inspection failed or was denied. Treat as blocked.')
  return lines.join('\n') + '\n'
}

async function main() {
  let protection
  let protectionError = false
  try {
    protection = await inspectMuseWriteProtection({
      token: process.env.GITHUB_TOKEN,
      repo: process.env.GITHUB_REPOSITORY
    })
  } catch {
    protectionError = true
  }
  const report = summarizeMuseActivation({
    secretConfigured: process.env.META_MODEL_SECRET_PRESENT === 'true',
    protection,
    protectionError
  })
  const output = activationMarkdown(report)
  console.log(output)
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, output)
  }
  if (report.status !== 'READY_FOR_LIVE_API_PROBE') process.exitCode = 2
}

if (process.argv[1]?.endsWith('neo-muse-activation-readiness.mjs')) {
  main().catch(() => {
    console.error('BLOCKED: Muse activation preflight could not complete')
    process.exitCode = 2
  })
}
