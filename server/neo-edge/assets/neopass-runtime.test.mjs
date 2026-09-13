import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import vm from 'node:vm'

const source = await fs.readFile(new URL('./neopass-runtime.js', import.meta.url), 'utf8')

function runtime() {
  const listeners = new Map()
  class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail }
  }
  const window = {
    addEventListener(type, handler) {
      const set = listeners.get(type) || new Set()
      set.add(handler)
      listeners.set(type, set)
    },
    dispatchEvent(event) {
      for (const handler of listeners.get(event.type) || []) handler(event)
      return true
    },
  }
  vm.runInNewContext(source, { window, CustomEvent, Date, Number, Object })
  return window
}

test('NEOpass runtime keeps tokens in memory and exposes the expected contract', async () => {
  const window = runtime()
  assert.equal(await window.NeoPass.getAccessToken(), null)
  assert.equal(window.NeoPass.setAccessToken('  token-1  '), true)
  assert.equal(await window.NeoPass.getAccessToken(), 'token-1')
  assert.equal(window.NeoPass.getSession().authenticated, true)
  window.NeoPass.clearAccessToken('test')
  assert.equal(await window.NeoPass.getAccessToken(), null)
})

test('NEOpass runtime accepts authenticated handoff events and clears expired tokens', async () => {
  const window = runtime()
  window.dispatchEvent(new (class { constructor(){ this.type='neo:neopass-authenticated'; this.detail={token:'event-token', expiresAt: Date.now()+60_000} } })())
  assert.equal(await window.NeoPass.getAccessToken(), 'event-token')
  window.NeoPass.setAccessToken('expired', { expiresAt: Date.now()-1 })
  assert.equal(await window.NeoPass.getAccessToken(), null)
})
