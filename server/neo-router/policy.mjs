export const PROVIDER_ROLES = Object.freeze({
  anthropic: ['orchestration', 'planning', 'review'],
  openai: ['reasoning', 'backend', 'tool-use'],
  gemini: ['frontend', 'design', 'multimodal'],
  cloudflare: ['edge', 'internet-of-things', 'resilience', 'low-latency'],
})

export const HUMAN_APPROVAL_ACTIONS = new Set([
  'external_execution',
  'financial_commitment',
  'transaction',
  'publication',
  'credential_change',
  'destructive_operation',
  'canonical_write',
  'public_institutional_representation',
  'production_deployment',
])

export const DOCTRINE_PROFILE = Object.freeze({
  id: 'NEO-ROUTER-144D',
  soundKey: '#D',
  referenceFrequencyHz: 144,
  tesseract: Object.freeze({
    humanAscent: Object.freeze([777, 888, 999]),
    angelicDescent: Object.freeze([999, 888, 777]),
    behavior: 'cyclical_restart',
  }),
  cipherDomains: Object.freeze([
    'security',
    'practicality',
    'logic',
    'principles',
    'morale',
    'ethics',
  ]),
  defensiveLabel: '666',
  interpretation:
    'Foundational NEO reasoning and rationale model. The paired 777-888-999 and 999-888-777 cycles guide review order and restart after completion; they are not cryptographic primitives, security proofs, or physical-frequency controls.',
})

export const EMERGING_INTERFACE_PROFILE = Object.freeze({
  id: 'NEO-PSITRONIC-READINESS-001',
  maturity: 'experimental_unverified',
  surfaces: Object.freeze([
    'applications', 'software', 'web', 'internet_of_things', 'media',
    'sensors', 'devices', 'wearables', 'robotics', 'assistive_interfaces',
  ]),
  transportContract: 'authenticated_event_envelope',
  requiredControls: Object.freeze([
    'explicit_informed_consent',
    'signed_device_identity',
    'least_privilege_capabilities',
    'sandboxed_adapter',
    'schema_validated_telemetry',
    'data_minimization',
    'local_kill_switch',
    'human_approval_for_actuation',
    'tamper_evident_audit_log',
    'measurable_reproducible_validation',
  ]),
  boundary:
    'Psitronic is a future-facing NEO research classification. No interface is treated as operational, causal, safe, or effective without measurable mechanisms and reproducible validation.',
})
