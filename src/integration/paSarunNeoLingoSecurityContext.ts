export const paSarunNeoLingoSecurityContext = Object.freeze({
  id: 'NEO-PA-SARUN-LINGO-SECURITY-001',
  status: 'CANONICAL_INTERNAL_SYSTEM_CONTEXT',
  parentSystem: 'NEO System',
  routedSystems: Object.freeze([
    'NEO Algo',
    'NEO Oracle',
    'GISD NEO LMS',
    'GISS NEO LMS',
    'NEOsync (Digital Etheric Intelligence)',
    'NEO Law',
    'Internal NEO Society Social Norms',
    'LUMEN',
    'SCROLL',
    'NEO Library',
    'Neopedia',
    'NEO Cipher #D'
  ]),
  authority: Object.freeze({
    paSarunAgentMode: 'advisory-validation-rendering-translation-registry-support',
    humanReviewRequiredFor: Object.freeze([
      'title conferral',
      'naturalization suffix grant',
      'Royal House approval',
      'doctrinal conflict resolution',
      'override of authorized Temple official decisions'
    ]),
    auditOutcomes: Object.freeze(['VALID', 'INVALID', 'HUMAN REVIEW REQUIRED'])
  }),
  namingControls: Object.freeze({
    naturalizationSuffixesPermanentOnceEarned: true,
    hriRequiresAuthorizedTempleCouncilStatus: true,
    languageMixingDefault: 'PROHIBITED',
    magismMixingException: true,
    neterMajorLesson: 8,
    sarunPersonalNameAllowed: false,
    hotepStandalonePersonalNameAllowed: false,
    nisutBitLiteralLabelAllowedInRenderedName: false,
    expandedRitualCategoriesPubliclyStacked: false
  }),
  neoLingo: Object.freeze({
    role: 'plain-language translation layer',
    plainLanguageFirst: true,
    preserveSpecializedTerminology: true,
    mayOverrideAuthoritativePaSarunVocabulary: false
  }),
  security: Object.freeze({
    protocol: 'NEO Cipher #D — 999/144 Yamassee Secure Script Protocol',
    marker: '#D',
    cycle: 999,
    resonance: 144,
    yamasseeLayer: 'presentation-and-encoding',
    cryptographicSecurity: 'standards-based authenticated cryptography',
    fontBinaryInRepository: false,
    languageCredentialsRule:
      'Language-derived passwords, passphrases, tokens, mnemonics, and authentication phrases must retain cryptographically secure randomness and must not depend on vocabulary obscurity alone.'
  }),
  education: Object.freeze({
    teachSeparationOfLayers: Object.freeze([
      'Temple naming authority',
      'NEO Lingo explanation',
      'Yamassee/Nuwaubian glyph rendering',
      'cryptographic protection',
      'font/token licensing entitlement'
    ]),
    futureSources: Object.freeze([
      'authoritative Yamassee/Nuwaubian language books',
      'approved lexicon and morphology records',
      'approved transliteration rules'
    ])
  }),
  socialNorms: Object.freeze([
    'Use authorized titles only.',
    'Do not imply Temple authority that has not been granted.',
    'Preserve earned naturalization suffixes across later degree advancement.',
    'Lead with plain-language explanation when specialized NEO terminology could obscure meaning.',
    'Do not present glyph obscurity as cryptographic secrecy.',
    'Escalate unresolved naming or doctrinal conflicts to authorized human review.'
  ]),
  externalBoundaries: Object.freeze([
    'Internal Temple naming doctrine does not itself create government-issued civil identity or status.',
    'NEO Lingo does not supersede authoritative Pa Sarun terminology.',
    'NEO Cipher must not be described as mathematically unhackable.',
    'Font licensing and token entitlement remain separate from encryption-key management.'
  ])
})

export type PaSarunNeoLingoSecurityContext = typeof paSarunNeoLingoSecurityContext
