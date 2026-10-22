import test from 'node:test'
import assert from 'node:assert/strict'
import {renderAutopilotApp,autopilotRoute} from './autopilot-app.mjs'

test('autopilot surface points to governed AI gateway endpoints',()=>{
  const html=renderAutopilotApp()
  assert.match(html,/\/api\/ai\/autopilot\/status/)
  assert.match(html,/\/api\/ai\/execute/)
  assert.match(html,/Protected actions remain governed/)
})

test('autopilot route recognizes canonical path',()=>{
  assert.equal(autopilotRoute(new URL('https://neo.holytemples.org/autopilot/')),true)
  assert.equal(autopilotRoute(new URL('https://neo.holytemples.org/')),false)
})
