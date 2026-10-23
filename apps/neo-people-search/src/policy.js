const BLOCKED_PATTERNS = [
  /track\s+(their|his|her)\s+location/i,
  /gps\s+track/i,
  /private\s+messages?/i,
  /read\s+(their|his|her)\s+texts?/i,
  /keystrokes?/i,
  /passwords?/i,
  /spy\s+on/i,
  /stalk/i,
  /doxx/i,
  /hidden\s+(camera|mic|microphone|monitoring)/i,
  /covert\s+surveillance/i
];

export function evaluateQueryIntent({ query = "", mode = "combined" } = {}) {
  const normalizedMode = String(mode || "combined").toLowerCase();
  const allowedModes = new Set(["internal", "public", "combined", "security"]);

  if (!allowedModes.has(normalizedMode)) {
    return {
      allowed: false,
      code: "INVALID_MODE",
      reason: "Search mode must be internal, public, combined, or security."
    };
  }

  const matched = BLOCKED_PATTERNS.find((pattern) => pattern.test(String(query)));
  if (matched) {
    return {
      allowed: false,
      code: "PROHIBITED_SURVEILLANCE_INTENT",
      reason:
        "NEO People Search supports authorized identity discovery and defensive security metadata, not covert tracking or collection of private communications or credentials."
    };
  }

  return {
    allowed: true,
    code: "ALLOWED",
    mode: normalizedMode
  };
}

export function sanitizeSecurityEvent(event = {}) {
  return {
    event_id: String(event.event_id || ""),
    person_id: String(event.person_id || ""),
    occurred_at: event.occurred_at || null,
    source_system: String(event.source_system || "unknown"),
    event_type: String(event.event_type || "unknown"),
    severity: ["info", "low", "medium", "high", "critical"].includes(event.severity)
      ? event.severity
      : "info",
    evidence_ref: event.evidence_ref ? String(event.evidence_ref) : null,
    authorized_scope: Boolean(event.authorized_scope)
  };
}

export function securityStatusFor(events = []) {
  const authorized = events.filter((event) => event.authorized_scope);
  if (!authorized.length) return "no-evidence";
  if (authorized.some((event) => ["high", "critical"].includes(event.severity))) {
    return "review";
  }
  return "verified-event";
}
