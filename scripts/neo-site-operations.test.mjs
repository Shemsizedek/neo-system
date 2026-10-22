import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectSite,buildEstateTargets,generateRepairWork,buildSelfHostingReadiness,loadHostRegistry,loadSiteOpsPolicy} from './neo-site-operations.mjs'

const okFetch=async url=>{
  const p=String(url)
  if(p.endsWith('/robots.txt'))return new Response('User-agent: *\nAllow: /',{status:200})
  if(p.endsWith('/sitemap.xml'))return new Response('<urlset></urlset>',{status:200})
  if(p.endsWith('/ads.txt'))return new Response('google.com, pub-test, DIRECT, test',{status:200})
  return new Response('<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>NEO Site Test</title><meta name="description" content="A sufficiently descriptive public page for NEO testing and verification."><link rel="canonical" href="https://example.test/"><script type="application/ld+json">{}</script></head><body>'+('public content '.repeat(40))+'</body></html>',{status:200})
}

test('healthy public surface is scored from verified technical checks',async()=>{
  const report=await inspectSite({url:'https://example.test',fetchImpl:okFetch})
  assert.ok(report.score>=80)
  assert.ok(report.findings.some(x=>x.id==='CRAWLER_ACCESS'&&x.state==='UNVERIFIED'))
})

test('verified failures produce repair work rather than automatic publication',async()=>{
  const badFetch=async url=>{
    if(String(url).endsWith('/robots.txt'))return new Response('',{status:404})
    if(String(url).endsWith('/sitemap.xml'))return new Response('',{status:404})
    if(String(url).endsWith('/ads.txt'))return new Response('',{status:404})
    return new Response('<html><head></head><body>short</body></html>',{status:200})
  }
  const report=await inspectSite({url:'https://example.test',fetchImpl:badFetch})
  const work=generateRepairWork(report)
  assert.ok(work.length>0)
  assert.ok(work.every(x=>x.auto_publish===false))
})

test('estate targets derive from canonical host registry',()=>{
  const targets=buildEstateTargets(loadHostRegistry())
  assert.ok(targets.some(x=>x.host==='holytemples.org'))
  assert.ok(targets.some(x=>x.host==='neo.holytemples.org'))
})

test('self-hosting readiness never authorizes migration by score alone',()=>{
  const policy=loadSiteOpsPolicy()
  const caps=Object.fromEntries(policy.self_hosting.requirements.map(x=>[x,true]))
  const result=buildSelfHostingReadiness({policy,capabilities:caps})
  assert.equal(result.readiness_percent,100)
  assert.equal(result.migration_authorized,false)
  assert.equal(result.capital_gate_required,true)
})

test('site policy preserves publishing and DNS authority boundaries',()=>{
  const policy=loadSiteOpsPolicy()
  assert.equal(policy.autonomy.may_auto_publish_editorial_content,false)
  assert.equal(policy.autonomy.may_auto_change_dns,false)
  assert.equal(policy.autonomy.may_auto_change_hosting_provider,false)
})
