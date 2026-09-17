import test from 'node:test'
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'

/**
 * Security tests for operator deployment smoke test credential exfiltration mitigation.
 * 
 * These tests verify that the pentest finding regarding credential exfiltration in the
 * domain activation and smoke test workflows has been properly mitigated by enforcing
 * a repository-controlled allowlist of permitted domains.
 * 
 * The vulnerability allowed attackers to provide caller-controlled operator_api and
 * site_suffix values that would cause smoke test credentials to be sent to attacker-
 * controlled endpoints. The mitigation requires all URLs to be validated against
 * NEO_OPERATOR_ALLOWED_DOMAINS before any credential transmission.
 */

async function runSmoke(env){
  return new Promise((resolve,reject)=>{
    const proc=spawn('node',['server/miner-production/operatorDeploymentSmoke.mjs'],{
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

test('smoke test rejects missing allowlist to prevent credential exfiltration',async()=>{
  // Reproduction: attacker provides malicious operator URL without allowlist enforcement
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://attacker.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.attacker.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'' // Empty allowlist must be rejected
  })
  assert.equal(result.code,1,'must fail when allowlist is empty')
  assert.match(result.stderr,/OPERATOR_SMOKE_ALLOWLIST_REQUIRED/,'must require allowlist')
})

test('smoke test rejects operator URL outside allowlist',async()=>{
  // Reproduction: attacker attempts to exfiltrate smoke credentials to their controlled domain
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://evil.attacker.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com,neo-prod.example.org'
  })
  assert.equal(result.code,1,'must reject operator URL outside allowlist')
  assert.match(result.stderr,/OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED/,'must block disallowed operator domain')
  assert.match(result.stderr,/evil\.attacker\.com/,'must identify the rejected domain')
})

test('smoke test rejects origin URL outside allowlist',async()=>{
  // Reproduction: attacker provides malicious origin alongside valid operator URL
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://evil.attacker.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must reject origin URL outside allowlist')
  assert.match(result.stderr,/OPERATOR_SMOKE_ORIGIN_DOMAIN_NOT_ALLOWED/,'must block disallowed origin domain')
  assert.match(result.stderr,/evil\.attacker\.com/,'must identify the rejected domain')
})

test('smoke test accepts exact domain match in allowlist',async()=>{
  // Valid configuration: operator URL exactly matches allowlist entry
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://neo.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  // Will fail on network/auth but should pass allowlist validation
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept exact domain match')
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept exact domain match')
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_ALLOWLIST_REQUIRED'),false,'must accept non-empty allowlist')
})

test('smoke test accepts subdomain under allowed domain',async()=>{
  // Valid configuration: operator URL is subdomain of allowlist entry
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept subdomain')
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept subdomain')
})

test('smoke test accepts multiple comma-separated allowed domains',async()=>{
  // Valid configuration: operator URL matches one of multiple allowlist entries
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo-prod.example.org',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com, neo-prod.example.org, neo-staging.example.net'
  })
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept domain from multi-entry allowlist')
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept domain from multi-entry allowlist')
})

test('smoke test rejects subdomain confusion attack',async()=>{
  // Security: attacker tries evil-neo.example.com when only neo.example.com is allowed
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.evil-neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must reject subdomain confusion')
  assert.match(result.stderr,/OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED/,'must block evil-neo.example.com when only neo.example.com allowed')
})

test('smoke test rejects domain suffix attack',async()=>{
  // Security: attacker tries attacker-neo.example.com.evil.com
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://neo.example.com.evil.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must reject domain suffix attack')
  assert.match(result.stderr,/OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED/,'must block suffix confusion')
})

test('smoke test is case-insensitive for domain matching',async()=>{
  // Valid configuration: case variations should be accepted
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://Operator.NEO.Example.COM',
    NEO_OPERATOR_ORIGIN:'https://Console.Neo.Example.Com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept case variations')
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept case variations')
})

test('smoke test validates allowlist before any network request',async()=>{
  // Security: ensure validation happens before credentials are used
  // This test verifies the fix is applied at the right point in execution
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://attacker.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.attacker.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  // Should fail on allowlist validation, not on network errors
  assert.equal(result.code,1,'must fail on allowlist validation')
  assert.match(result.stderr,/OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED/,'must validate before network')
  assert.equal(result.stderr.match(/fetch|ENOTFOUND|ECONNREFUSED/),null,'must not attempt network request')
})

test('smoke test still requires HTTPS after allowlist validation',async()=>{
  // Defense in depth: HTTPS requirement remains in place
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'http://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must still enforce HTTPS')
  assert.match(result.stderr,/HTTPS_REQUIRED/,'must require HTTPS')
})

test('smoke test allowlist handles whitespace in domain list',async()=>{
  // Robustness: allowlist parsing should handle extra whitespace
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo-prod.example.org',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'  neo.example.com  ,  neo-prod.example.org  ,  '
  })
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must handle whitespace')
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must handle whitespace')
})

test('smoke test works without credentials when allowlist is valid',async()=>{
  // Smoke test can run health checks without credentials
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://operator.neo.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.neo.example.com',
    NEO_SMOKE_OPERATOR_ID:'', // No credentials
    NEO_SMOKE_OPERATOR_PASSWORD:'',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  // Should pass allowlist validation even without credentials
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED'),false,'must accept valid domains')
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_ORIGIN_DOMAIN_NOT_ALLOWED'),false,'must accept valid domains')
  assert.equal(result.stderr.includes('OPERATOR_SMOKE_ALLOWLIST_REQUIRED'),false,'must accept non-empty allowlist')
})

test('smoke test prevents credential use with disallowed domain even if credentials present',async()=>{
  // Security: credentials should never be sent to disallowed domains
  const result=await runSmoke({
    NEO_OPERATOR_PUBLIC_URL:'https://attacker.example.com',
    NEO_OPERATOR_ORIGIN:'https://console.attacker.example.com',
    NEO_SMOKE_OPERATOR_ID:'smoke-operator',
    NEO_SMOKE_OPERATOR_PASSWORD:'smoke-password',
    NEO_OPERATOR_ALLOWED_DOMAINS:'neo.example.com'
  })
  assert.equal(result.code,1,'must fail before using credentials')
  assert.match(result.stderr,/OPERATOR_SMOKE_OPERATOR_DOMAIN_NOT_ALLOWED/,'must block before credential use')
  // Verify no login attempt was made (would show LOGIN_ error if credentials were sent)
  assert.equal(result.stderr.includes('LOGIN_'),false,'must not attempt login to disallowed domain')
})
