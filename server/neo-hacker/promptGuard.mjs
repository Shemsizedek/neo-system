const SIGNALS = [
  { code: 'NH-PI-01', weight: 4, re: /\b(ignore|override|disregard)\b.{0,40}\b(instruction|policy|system|developer)\b/i },
  { code: 'NH-PI-16', weight: 4, re: /\b(i am|act as|pretend to be)\b.{0,30}\b(system|developer|administrator|root)\b/i },
  { code: 'NH-PI-09', weight: 5, re: /\b(api[_ -]?key|password|secret|token|credential|private key)\b.{0,60}\b(send|post|upload|exfiltrat|forward|reveal)\b/i },
  { code: 'NH-PI-13', weight: 5, re: /\b(execute|run|shell|terminal|command)\b.{0,40}\b(output|response|content|text)\b/i },
  { code: 'NH-PI-19', weight: 5, re: /\b(persist|autorun|startup|scheduled task|launch agent)\b/i },
  { code: 'NH-PI-03', weight: 2, re: /\b(base64|rot13|hex encoded|decode this)\b/i }
];

function normalizeSource(source = {}) {
  return {
    kind: String(source.kind || 'unknown'),
    trusted: source.trusted === true,
    provenance: source.provenance || null
  };
}

export function inspectUntrustedContent(input, source = {}) {
  const text = typeof input === 'string' ? input : JSON.stringify(input ?? '');
  const src = normalizeSource(source);
  const matches = [];
  let score = 0;

  for (const signal of SIGNALS) {
    if (signal.re.test(text)) {
      matches.push(signal.code);
      score += signal.weight;
    }
  }

  if (!src.trusted && /\b(system message|developer message|higher priority|hidden instruction)\b/i.test(text)) {
    matches.push('NH-PI-16');
    score += 4;
  }

  const unique = [...new Set(matches)];
  const level = score >= 8 ? 'critical' : score >= 5 ? 'high' : score >= 3 ? 'medium' : score > 0 ? 'low' : 'none';

  return {
    decision: level === 'critical' || level === 'high' ? 'quarantine' : level === 'medium' ? 'review' : 'allow',
    riskLevel: level,
    score,
    threatCodes: unique,
    source: src,
    contentAuthority: src.trusted ? 'trusted-data' : 'untrusted-data',
    executableAuthority: false
  };
}

export function sourceSinkViolation({ sourceTrust = 'untrusted', containsSecret = false, sink = 'none' } = {}) {
  const externalSinks = new Set(['network', 'email', 'webhook', 'connector-write', 'file-share']);
  return Boolean(containsSecret && sourceTrust !== 'trusted' && externalSinks.has(sink));
}
