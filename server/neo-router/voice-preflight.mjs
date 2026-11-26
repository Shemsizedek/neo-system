import { readFile } from 'node:fs/promises'
import { totalmem, freemem, cpus } from 'node:os'
import { pathToFileURL } from 'node:url'
import { createLocalModels } from './voice-local.mjs'

// No installs, model pulls, credentials, telephone actions or paid fallbacks.
export async function preflight({ model, models = createLocalModels({ model }),
  wavPath, smoke = false, read = readFile } = {}) {
  const report = {
    schema_version: 1, checked_at: new Date().toISOString(),
    host: { node_major: Number(process.versions.node.split('.')[0]),
      cpu_count: cpus().length, total_memory_bytes: totalmem(), free_memory_bytes: freemem() },
    llm: { ready: false }, text_inference: { tested: false, passed: false },
    transcription: { tested: false, passed: false },
    device_speech: { tested: false, reason: 'Requires a browser on the target device' },
    phone_connected: false, production_ready: false, blockers: []
  }
  try { report.llm = await models.ready() }
  catch { report.llm = { ready: false, reason: 'Local model readiness failed' } }
  if (report.host.node_major < 24) report.blockers.push('Node 24 or later required')
  if (!report.llm.ready) report.blockers.push(report.llm.reason || 'Local model unavailable')
  if (smoke && report.llm.ready) {
    report.text_inference.tested = true
    try {
      const reply = await models.chat('operations', 'Identify yourself briefly as an AI assistant.')
      report.text_inference.passed = typeof reply === 'string' && reply.trim().length > 0
    } catch {}
  }
  if (!report.text_inference.passed) report.blockers.push('A successful real text inference is not evidenced')
  if (wavPath) {
    report.transcription.tested = true
    try {
      const audio = await read(wavPath)
      if (audio.length < 44 || audio.length > 2000000 ||
          audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') {
        throw new Error('Invalid WAV')
      }
      const text = await models.transcribe(audio)
      report.transcription.passed = typeof text === 'string' && text.trim().length > 0
    } catch {}
  }
  if (!report.transcription.passed) report.blockers.push('A successful real WAV transcription is not evidenced')
  // A nonempty result is transport evidence, not a quality or accuracy assessment.
  report.local_pipeline_responded = report.text_inference.passed && report.transcription.passed
  report.blockers.push('On-device speech output untested', 'No telephone or meeting transport attached')
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const at = args.indexOf('--wav')
  if (args.some((a, i) => a !== '--smoke' && a !== '--wav' && !(at !== -1 && i === at + 1)) ||
      (at !== -1 && (!args[at + 1] || args[at + 1].startsWith('--')))) {
    console.error('Usage: node server/neo-router/voice-preflight.mjs [--smoke] [--wav PATH]')
    process.exitCode = 2
  } else {
    const result = await preflight({ model: process.env.NEO_VOICE_MODEL,
      smoke: args.includes('--smoke'), wavPath: at === -1 ? undefined : args[at + 1] })
    console.log(JSON.stringify(result, null, 2))
    process.exitCode = result.local_pipeline_responded ? 0 : 1
  }
}
