const SEVERITIES = new Set(['INFO','LOW','MEDIUM','HIGH','CRITICAL']);
const STATES = new Set(['OBSERVATION','SUSPICION','CONFIRMED_SECURITY_EVENT']);

function clean(value, max = 4000) {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max);
}

export function buildEndpointSecurityEvent({ endpointId, diagnostic, severity = 'INFO', state = 'OBSERVATION' } = {}) {
  if (!String(endpointId ?? '').startsWith('neo:endpoint:')) throw new Error('invalid_endpoint_id');
  if (!diagnostic || diagnostic.schema !== 'neo.endpoint.diagnostic.v1') throw new Error('invalid_diagnostic');
  if (!SEVERITIES.has(severity)) throw new Error('invalid_severity');
  if (!STATES.has(state)) throw new Error('invalid_state');
  return Object.freeze({
    schema: 'neo.hacker.endpoint-event.v1',
    endpointId: clean(endpointId, 200),
    observedAt: diagnostic.observedAt,
    severity,
    state,
    source: Object.freeze({
      type: 'AUTHORIZED_ADB_DIAGNOSTIC',
      trust: 'UNTRUSTED_CONTENT_DATA_ONLY',
      diagnostic: clean(diagnostic.name, 100)
    }),
    evidence: Object.freeze({
      stdout: clean(diagnostic.stdout),
      stderr: clean(diagnostic.stderr, 1000)
    }),
    controls: Object.freeze({
      executableInstructions: false,
      toolAuthority: 'NONE',
      inheritedInstructions: false,
      sourceToSinkPolicy: 'NO_UNTRUSTED_TEXT_TO_TOOL_ARGUMENTS',
      planDriftCheckRequired: true,
      humanApprovalForConsequentialAction: true,
      founderOverride: false
    })
  });
}
