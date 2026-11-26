import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createLocalModels, createVoiceServer, localOrigin } from './voice-local.mjs'

test('model traffic rejects public hosts, credentials, paths and redirects', async () => {
  for (const url of ['https://example.com', 'http://localhost', 'http://127.0.0.1/a', 'http://u:p@127.0.0.1', 'http://127.0.0.1?x=1']) {
    assert.throws(() => localOrigin(url))
  }
  const calls = []
  const models = createLocalModels({ model: 'local-model', fetchImpl: async (url, options) => {
    calls.push({ url, options })
    return Response.json(url.endsWith('/api/tags') ? { models: [{ name: 'local-model' }] } : { message: { content: 'Hello' } })
  } })
  assert.equal(await models.chat('sales', 'Test'), 'Hello')
  assert.equal(calls.length, 2)
  for (const call of calls) {
    assert.ok(call.url.startsWith('http://127.0.0.1:11434/'))
    assert.equal(call.options.redirect, 'error')
  }
})

test('missing or explicitly cloud model fails closed without inference', async () => {
  let used = 0
  const fetchImpl = async () => { used++; throw new Error('offline') }
  for (const model of [undefined, 'model:cloud']) {
    const models = createLocalModels({ model, fetchImpl })
    assert.equal((await models.ready()).ready, false)
    await assert.rejects(models.chat('sales', 'Hello'))
  }
  assert.equal(used, 0)
})

async function withServer(t, models) {
  const server = createVoiceServer({ models })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  return 'http://127.0.0.1:' + server.address().port
}
const headers = { 'Content-Type': 'application/json', 'X-NEO-Local': '1' }
test('HTTP conversation uses NEO envelope and rejects foreign origins and invalid data', async t => {
  let turns = 0
  const url = await withServer(t, {
    ready: async () => ({ ready: true }),
    chat: async () => { turns++; return 'AI response' }
  })
  const post = (body, extra = {}) => fetch(url + '/chat', { method: 'POST', headers: { ...headers, ...extra }, body })
  assert.equal((await post('{"role":"sales","text":"Hi"}', { Origin: 'https://foreign.example' })).status, 403)
  assert.equal((await post('bad-json')).status, 400)
  assert.equal((await post('{"role":"trader","text":"Buy"}')).status, 400)
  assert.equal((await post(JSON.stringify({ role: 'sales', text: 'x'.repeat(4001) }))).status, 400)
  const response = await post('{"role":"sales","text":"Hi"}')
  const data = await response.json()
  assert.equal(response.status, 200)
  assert.equal(data.reply, 'AI response')
  assert.equal(data.event.event_type, 'VOICE_LOCAL_TURN')
  assert.equal(data.event.payload.external_action, false)
  assert.equal(turns, 1)
  assert.equal((await (await fetch(url + '/health')).json()).phone_connected, false)
})

test('WAV validation and resource bounds reject payloads before local transcription', async t => {
  let transcribed = 0
  const url = await withServer(t, { ready: async () => ({ ready: false }),
    transcribe: async () => { transcribed++; return 'hello' } })
  const upload = (body, type = 'audio/wav') => fetch(url + '/transcribe',
    { method: 'POST', headers: { 'Content-Type': type, 'X-NEO-Local': '1' }, body })
  assert.equal((await upload(Buffer.alloc(44), 'audio/webm')).status, 415)
  assert.equal((await upload(Buffer.alloc(44))).status, 400)
  assert.equal((await upload(Buffer.alloc(2000001))).status, 413)
  const wav = Buffer.alloc(44); wav.write('RIFF'); wav.write('WAVE', 8)
  assert.equal((await upload(wav)).status, 200)
  assert.equal(transcribed, 1)
})

test('unavailable local service does not select a paid fallback', async t => {
  const url = await withServer(t, { chat: async () => { throw new Error('private service details') } })
  const r = await fetch(url + '/chat', { method: 'POST', headers, body: '{"role":"sales","text":"Hi"}' })
  assert.equal(r.status, 503)
  const data = await r.json()
  assert.match(data.error, /no paid fallback/)
  assert.doesNotMatch(data.error, /private service details/)
})
