import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {readFile,unlink} from 'node:fs/promises'

/**
 * Security tests for production attestation workflow credential exfiltration mitigation.
 * 
 * These tests verify that the pentest finding "Production workflows send operator credentials 
 * to caller-selected HTTPS hosts" has been properly mitigated by enforcing a repository-controlled
 * allowlist of permitted domains.
 * 
 * The vulnerability allowed attackers with workflow dispatch privileges to direct production
 * credentials to attacker-controlled HTTPS endpoints. The mitigation requires all operator
 * and origin URLs to be validated against NEO_OPERATOR_ALLOWED_DOMAINS before any credential
 * transmission occurs.
 */

async function runAttestation(env){
  return new Promise((resolve,reject)=>{
    const proc=spawn('node',['server/miner-production/attestProductionLive.mjs'],{
      env:{...process.env,...env},
      stdio:'pipe'
    })
    let stdout='',stderr=''
    proc.stdout.on('data',d=>stdout+=d.toString())
    proc.stderr.on('data',d=>stderr+=d.toString())
    proc.on('close',code=>resolve({code,stdout,stderr}))
    proc.on('error',reject)
    setTimeout(()=>{proc.kill();reject(new Error('TIMEOUT'))},5000)
  })
}

test('attestation rejects missing allowlist to prevent credential exfiltration',async()=>{
  // Reproduction: attacker provides malicious operator URL without allowlist enforcement
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://attacker.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.attacker.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'' // Empty allowlist must be rejected
  })
  assert.equal(result.code,1,'must fail when allowlist is empty')
  assert.match(result.stderr,/PRODUCTION_ATTESTATION_ALLOWLIST_REQUIRED/,'must require allowlist')
})

test('attestation rejects operator URL outside allowlist',async()=>{
  // Reproduction: attacker attempts to exfiltrate credentials to their controlled domain
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://evil.attacker.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com,neo-prod.example.org'
  })
  assert.equal(result.code,1,'must reject operator URL outside allowlist')
  assert.match(result.stderr,/PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED/,'must block disallowed operator domain')
  assert.match(result.stderr,/evil\.attacker\.com/,'must identify the rejected domain')
})

test('attestation rejects origin URL outside allowlist',async()=>{
  // Reproduction: attacker provides malicious origin to bypass CORS or other checks
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://evil.attacker.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must reject origin URL outside allowlist')
  assert.match(result.stderr,/PRODUCTION_ATTESTATION_ORIGIN_DOMAIN_NOT_ALLOWED/,'must block disallowed origin domain')
  assert.match(result.stderr,/evil\.attacker\.com/,'must identify the rejected domain')
})

test('attestation accepts exact domain match in allowlist',async()=>{
  // Valid configuration: operator URL exactly matches allowlist entry
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://neo.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  // Will fail on network/auth but should pass allowlist validation
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept exact domain match')
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept exact domain match')
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_ALLOWLIST_REQUIRED'),false,'must accept non-empty allowlist')
})

test('attestation accepts subdomain under allowed domain',async()=>{
  // Valid configuration: operator URL is subdomain of allowlist entry
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept subdomain')
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept subdomain')
})

test('attestation accepts multiple comma-separated allowed domains',async()=>{
  // Valid configuration: operator URL matches one of multiple allowlist entries
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo-prod.example.org',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com, neo-prod.example.org, neo-staging.example.net'
  })
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept domain from multi-entry allowlist')
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept domain from multi-entry allowlist')
})

test('attestation rejects subdomain confusion attack',async()=>{
  // Security: attacker tries evil-neo.example.com when only neo.example.com is allowed
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.evil-neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must reject subdomain confusion')
  assert.match(result.stderr,/PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED/,'must block evil-neo.example.com when only neo.example.com allowed')
})

test('attestation rejects domain suffix attack',async()=>{
  // Security: attacker tries attacker-neo.example.com.evil.com
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://neo.example.com.evil.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must reject domain suffix attack')
  assert.match(result.stderr,/PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED/,'must block suffix confusion')
})

test('attestation is case-insensitive for domain matching',async()=>{
  // Valid configuration: case variations should be accepted
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://Operator.NEO.Example.COM',
    NEO_OPERATOR_ORIGIN:'https://Console.Neo.Example.Com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept case variations')
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept case variations')
})

test('attestation validates allowlist before any network request',async()=>{
  // Security: ensure validation happens before credentials are used
  // This test verifies the fix is applied at the right point in execution
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://attacker.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.attacker.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  // Should fail on allowlist validation, not on network errors
  assert.equal(result.code,1,'must fail on allowlist validation')
  assert.match(result.stderr,/PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED/,'must validate before network')
  assert.equal(result.stderr.match(/fetch|ENOTFOUND|ECONNREFUSED/),null,'must not attempt network request')
})

test('attestation still requires HTTPS after allowlist validation',async()=>{
  // Defense in depth: HTTPS requirement remains in place
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'http://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must still enforce HTTPS')
  assert.match(result.stderr,/PRODUCTION_ATTESTATION_HTTPS_REQUIRED/,'must require HTTPS')
})

test('attestation allowlist handles whitespace in domain list',async()=>{
  // Robustness: allowlist parsing should handle extra whitespace
  const result=await runAttestation({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo-prod.example.org',
    NEO_ATTEST_OPERATOR_ID:'test-operator',
    NEO_ATTEST_OPERATOR_PASSWORD:'test-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'  neo.example.com  ,  neo-prod.example.org  ,  '
  })
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must handle whitespace')
  assert.equal(result.stderr.includes('PRODUCTION_ATTESTATION_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must handle whitespace')
})
