export const PROVIDER_ROLES = Object.freeze({
  anthropic: ['orchestration', 'planning', 'review'],
  openai: ['reasoning', 'backend', 'tool-use'],
  gemini: ['frontend', 'design', 'multimodal'],
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
  sequence: [999, 888, 999],
  defensiveLabel: '666',
  interpretation:
    'Symbolic NEO doctrine metadata used for policy naming and audit classification; not a cryptographic primitive, security proof, or physical-frequency control.',
})
