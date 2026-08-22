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
