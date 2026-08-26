import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {controllerSnapshot,loadControllerConfig} from './controller.mjs'

test('controller snapshot identifies appliance version',()=>{
  const s=controllerSnapshot({startedAt:'2026-01-01T00:00:00.000Z',agentState:'RUNNING',discovered:[{host:'192.168.1.10'}]})
  assert.equal(s.product,'NEO Miner Controller')
  assert.equal(s.version,'0.8.0')
  assert.equal(s.agentState,'RUNNING')
  assert.equal(s.discoveredMiners.length,1)
})

test('controller config requires core fields',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'neo-controller-'))
  const file=path.join(dir,'config.json')
  await fs.writeFile(file,JSON.stringify({listenHost:'127.0.0.1'}))
  await assert.rejects(()=>loadControllerConfig(file),/Missing controller config/)
})
