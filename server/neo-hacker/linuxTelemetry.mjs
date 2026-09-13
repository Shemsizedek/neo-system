const SAFE_FIELDS = new Set([
  'timestamp','host','kernel','processName','processId','parentProcessId','binaryPath','binaryHash',
  'userId','effectiveUserId','capabilities','listeningPorts','remoteAddress','remotePort','protocol',
  'eventType','severity','source','integrityStatus'
])

const FORBIDDEN_FIELDS = new Set([
  'keystrokes','typedText','password','passwords','secret','secrets','token','tokens','clipboard',
  'clipboardContents','messageBody','messageBodies','privateKey','privateKeys','apiKey','apiKeys'
])

export function sanitizeLinuxTelemetry(event = {}) {
  const out = {}
  for (const [key, value] of Object.entries(event)) {
    if (FORBIDDEN_FIELDS.has(key)) continue
    if (SAFE_FIELDS.has(key)) out[key] = structuredClone(value)
  }
  return Object.freeze(out)
}

export function buildLinuxObservation(event = {}) {
  return Object.freeze({
    mode: 'observe-only',
    platform: 'linux',
    collectedAt: new Date().toISOString(),
    telemetry: sanitizeLinuxTelemetry(event),
  })
}

export function detectSensitiveCapture(event = {}) {
  const present = Object.keys(event).filter(key => FORBIDDEN_FIELDS.has(key))
  return Object.freeze({
    detected: present.length > 0,
    forbiddenFields: present,
    action: present.length ? 'drop-and-alert' : 'accept-metadata',
  })
}
