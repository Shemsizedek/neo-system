const byId = id => document.getElementById(id)
const output = byId('output')
async function call(path, body, type) {
  const r = await fetch(path, { method: 'POST',
    headers: { 'Content-Type': type, 'X-NEO-Local': '1' }, body })
  const value = await r.json()
  if (!r.ok) throw new Error(value.error)
  return value
}
async function action(button, task) {
  button.disabled = true
  try { await task() } catch (e) { output.textContent = e.message }
  finally { button.disabled = false }
}
byId('send').onclick = () => action(byId('send'), async () => {
  const result = await call('/chat', JSON.stringify({ role: byId('role').value, text: byId('text').value }), 'application/json')
  output.textContent = result.reply
  if (byId('speak').checked) {
    const engine = window.speechSynthesis
    const voice = engine?.getVoices().find(v => v.localService === true && v.lang.startsWith('en'))
    if (!voice) { output.textContent += '\n\nNo on-device voice available; using text.'; return }
    engine.cancel()
    const speech = new SpeechSynthesisUtterance(result.reply)
    speech.voice = voice
    engine.speak(speech)
  }
})
byId('transcribe').onclick = () => action(byId('transcribe'), async () => {
  const file = byId('wav').files[0]
  if (!file || file.size > 2000000) throw new Error('Choose a WAV file under 2 MB.')
  const result = await call('/transcribe', file, 'audio/wav')
  byId('text').value = result.text
  output.textContent = 'Transcribed locally. Review the text, then select Ask NEO.'
})
fetch('/health').then(r => r.json()).then(s => {
  byId('health').textContent = s.readiness.ready ? 'Local model ready.' : s.readiness.reason
}).catch(() => { byId('health').textContent = 'Local service unavailable.' })
