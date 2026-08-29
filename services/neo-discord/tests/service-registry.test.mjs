import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {serviceRegistry,findService,formatService} from '../core/service-registry.js'

const registry=JSON.parse(fs.readFileSync(new URL('../registry/services.json',import.meta.url),'utf8'))
const normalization=JSON.parse(fs.readFileSync(new URL('../../../architecture/neo-services-normalization.json',import.meta.url),'utf8'))
const pages=JSON.parse(fs.readFileSync(new URL('../../../architecture/neo-pages-routes.json',import.meta.url),'utf8'))

test('registry follows three-plane standard and covers every app',()=>{
  assert.deepEqual(registry.planes,{backend:'github',frontend:'github-pages',serverApi:'discord'})
  const ids=new Set(registry.services.map(x=>x.id))
  for(const app of normalization.apps)assert.ok(ids.has(app.id),`missing app ${app.id}`)
  assert.equal(ids.size,registry.services.length,'duplicate service ids')
})

test('public Pages services use registered canonical paths',()=>{
  const pagePaths=new Set(pages.routes.map(x=>x.path))
  for(const service of registry.services.filter(x=>x.pagesPath))assert.ok(pagePaths.has(service.pagesPath)||service.id==='neo-guardian',`unregistered Pages path ${service.id}:${service.pagesPath}`)
})

test('runtime registry matches machine registry',()=>{
  const runtime=serviceRegistry()
  assert.deepEqual(runtime,registry.services)
  assert.equal(findService('NEOPAY')?.id,'neopay')
  assert.match(formatService(findService('neo-relations')),/\/relations/)
  assert.match(formatService(findService('neo-prime')),/\/neo/)
})

test('registry remains fail-closed for sensitive Discord operations',()=>{
  assert.equal(registry.rules.discordSensitiveExecution,false)
  assert.equal(registry.rules.discordApproval,false)
  assert.equal(registry.rules.aiApproval,false)
  assert.equal(registry.rules.transportOwnsBusinessLogic,false)
})
