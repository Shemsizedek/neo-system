import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateHost, isLoopbackOllamaOrigin, executableOnPath,
} from './neo-omarchy-preflight.mjs'

const ready = {
  platform: 'linux',
  osRelease: 'NAME="Arch Linux"\nID=arch\n',
  nodeMajor: 24,
  binaries: { omarchy: true, git: true, ollama: true, podman: true },
}

test('valid Omarchy lab host is only preflight-approved, never production-ready', () => {
  const result = evaluateHost(ready)
  assert.equal(result.status, 'lab-preflight-passed')
  assert.equal(result.ready_for_production, false)
  assert.equal(result.agents_enabled, false)
  assert.equal(result.services_started, false)
})

test('non-Omarchy and non-Linux systems remain blocked', () => {
  assert.equal(evaluateHost({ ...ready, platform: 'darwin' }).status, 'blocked')
  assert.equal(evaluateHost({ ...ready, binaries: { ...ready.binaries, omarchy: false } }).status, 'blocked')
  assert.equal(evaluateHost({ ...ready, osRelease: 'ID=ubuntu\n' }).status, 'blocked')
})

test('missing Node 24 or git requires setup without executing anything', () => {
  assert.equal(evaluateHost({ ...ready, nodeMajor: 22 }).status, 'needs-setup')
  assert.equal(evaluateHost({ ...ready, binaries: { ...ready.binaries, git: false } }).status, 'needs-setup')
})

test('Ollama is optional in Gate 001, but a configured endpoint must be local', () => {
  assert.equal(evaluateHost({ ...ready, binaries: { ...ready.binaries, ollama: false } }).status, 'lab-preflight-passed')
  assert.equal(isLoopbackOllamaOrigin('http://127.0.0.1:11434'), true)
  assert.equal(isLoopbackOllamaOrigin('http://localhost:11434'), true)
  for (const endpoint of ['https://example.com/', 'http://0.0.0.0:11434', 'file:///tmp/model', 'http://user:pass@localhost:11434']) {
    assert.equal(isLoopbackOllamaOrigin(endpoint), false)
    assert.equal(evaluateHost({ ...ready, ollamaBaseUrl: endpoint }).status, 'blocked')
  }
})

test('PATH lookup accepts only constant executable names', () => {
  assert.equal(executableOnPath('git; echo hacked'), false)
  assert.equal(executableOnPath('../ollama'), false)
  assert.equal(executableOnPath('not-a-real-neo-binary', ''), false)
})
