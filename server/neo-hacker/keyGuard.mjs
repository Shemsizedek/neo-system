const FORBIDDEN_FIELDS = new Set([
  'keystrokes', 'rawKeys', 'typedText', 'password', 'secret', 'clipboardContents', 'messageBody'
]);

export function sanitizeInputTelemetry(event = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(event)) {
    if (!FORBIDDEN_FIELDS.has(key)) safe[key] = value;
  }
  return {
    timestamp: safe.timestamp || new Date().toISOString(),
    eventType: safe.eventType || 'input-security-event',
    processName: safe.processName || null,
    processId: Number.isFinite(safe.processId) ? safe.processId : null,
    executableHash: safe.executableHash || null,
    signer: safe.signer || null,
    privilege: safe.privilege || null,
    hookType: safe.hookType || null,
    destinationHost: safe.destinationHost || null,
    authorized: safe.authorized === true,
    threatCode: safe.threatCode || null,
    note: safe.note || null
  };
}

export function evaluateInputCapture(event = {}) {
  const telemetry = sanitizeInputTelemetry(event);
  const suspiciousHook = ['global-keyboard-hook', 'accessibility-capture', 'credential-field-hook'].includes(telemetry.hookType);
  const unauthorized = telemetry.authorized !== true;

  return {
    telemetry,
    suspicious: suspiciousHook && unauthorized,
    response: suspiciousHook && unauthorized ? 'quarantine-process-and-escalate' : 'observe',
    rawInputCaptured: false
  };
}
