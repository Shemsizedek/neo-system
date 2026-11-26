import test from 'node:test'
import assert from 'node:assert/strict'
import { preflight } from './voice-preflight.mjs'

test('readiness does not masquerade as tested inference or phone activation', async () => {
  let calls = 0
  const result = await preflight({ models: { ready: async () => ({ ready: true }),
    chat: async () => { calls++; return 'reply' } } })
  assert.equal(calls, 0)
  assert.equal(result.text_inference.tested, false)
  assert.equal(result.local_pipeline_responded, false)
  assert.equal(result.phone_connected, false)
  assert.equal(result.production_ready, false)
})

test('offline LLM prevents inference even with smoke requested', async () => {
  const result = await preflight({ smoke: true, models: {
    ready: async () => ({ ready: false, reason: 'offline' }),
    chat: async () => { throw new Error('must not run') }
  } })
  assert.equal(result.text_inference.tested, false)
  assert.ok(result.blockers.includes('offline'))
})

test('successful transport checks do not certify quality or production', async () => {
  const wav = Buffer.alloc(44); wav.write('RIFF'); wav.write('WAVE', 8)
  const result = await preflight({ smoke: true, wavPath: 'fixture.wav', read: async () => wav,
    models: { ready: async () => ({ ready: true }), chat: async () => 'AI assistant',
      transcribe: async () => 'test sentence' } })
  assert.equal(result.local_pipeline_responded, true)
  assert.equal(result.production_ready, false)
  assert.equal(JSON.stringify(result).includes('test sentence'), false)
})

test('invalid WAV and failed inference stay blocked without leaking private errors', async () => {
  let transcribed = false
  const result = await preflight({ smoke: true, wavPath: 'fixture.wav', read: async () => Buffer.alloc(44),
    models: { ready: async () => ({ ready: true }),
      chat: async () => { throw new Error('private path') },
      transcribe: async () => { transcribed = true } } })
  assert.equal(transcribed, false)
  assert.equal(result.local_pipeline_responded, false)
  assert.equal(JSON.stringify(result).includes('private path'), false)
})
