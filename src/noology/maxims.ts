export type NeoMaximDomain =
  | 'nature'
  | 'truth'
  | 'stewardship'
  | 'credit'
  | 'succession'
  | 'evidence'
  | 'restoration'
  | 'knowledge'

export type NeoMaxim = {
  id: string
  title: string
  statement: string
  domain: NeoMaximDomain
  operationalMeaning: string
}

/**
 * NEO Maxims are first-principle controls for reasoning inside the NEO System.
 * They do not silently rewrite historical source records. They guide how the
 * system interprets, compares and explains records while preserving provenance.
 */
export const neoMaxims: NeoMaxim[] = [
  {
    id: 'NMX-001',
    title: 'Nature Is the First Jurisdiction',
    statement: 'Nature is the first jurisdiction.',
    domain: 'nature',
    operationalMeaning:
      'Every analysis should identify the natural, ecological, biological and lived context before reducing a question to institutional text alone.'
  },
  {
    id: 'NMX-002',
    title: 'Truth Precedes Title',
    statement: 'Truth precedes title.',
    domain: 'truth',
    operationalMeaning:
      'A title, label or institutional classification cannot replace provenance, chronology, evidence and the underlying facts asserted by the record.'
  },
  {
    id: 'NMX-003',
    title: 'Successor Benefit Carries Successor Accountability',
    statement: 'Successor benefit carries successor accountability.',
    domain: 'succession',
    operationalMeaning:
      'When evaluating succession, track inherited rights, benefits, duties, liabilities, profits and predecessor relationships instead of treating each institution as historically isolated.'
  },
  {
    id: 'NMX-004',
    title: 'Credit Follows Contribution',
    statement: 'Credit follows contribution.',
    domain: 'credit',
    operationalMeaning:
      'The system should preserve who contributed labor, knowledge, land, stewardship, value or capital before allocating intellectual or economic credit.'
  },
  {
    id: 'NMX-005',
    title: 'Issuance Is Not Ownership',
    statement: 'Issuance is not ownership.',
    domain: 'evidence',
    operationalMeaning:
      'Token supply, certificate face quantity, wallet holdings, liquidity and market value remain separate fields until evidence links them.'
  },
  {
    id: 'NMX-006',
    title: 'Possession Is Not Origin',
    statement: 'Possession is not origin.',
    domain: 'evidence',
    operationalMeaning:
      'Current custody or control does not erase origin, predecessor provenance, authorship or prior stewardship.'
  },
  {
    id: 'NMX-007',
    title: 'A Record Preserves the Claim',
    statement: 'A record preserves the claim; evidence establishes its weight.',
    domain: 'evidence',
    operationalMeaning:
      'Source assertions are preserved faithfully while evidence status is tracked independently and transparently.'
  },
  {
    id: 'NMX-008',
    title: 'Stewardship Outranks Exploitation',
    statement: 'Stewardship outranks exploitation.',
    domain: 'stewardship',
    operationalMeaning:
      'Reasoning should measure effects on people, land, ecosystems, continuity and future generations, not only extraction or institutional gain.'
  },
  {
    id: 'NMX-009',
    title: 'Restoration Is Accounting',
    statement: 'Restoration is an accounting function as well as a moral one.',
    domain: 'restoration',
    operationalMeaning:
      'Restorative analysis should identify original right or contribution, taking or loss, successor benefit, measurable impact, evidence and proposed remedy.'
  },
  {
    id: 'NMX-010',
    title: 'Knowledge Without Conscience Becomes Machinery',
    statement: 'Knowledge without conscience becomes machinery.',
    domain: 'knowledge',
    operationalMeaning:
      'The system must surface human, ecological and ethical consequences when formal optimization would otherwise erase them.'
  },
  {
    id: 'NMX-011',
    title: 'Law Without Nature Becomes Administration',
    statement: 'Law without nature becomes administration.',
    domain: 'nature',
    operationalMeaning:
      'Formal rules are analyzed alongside natural context, lived consequences and the communities whose relationships are being governed.'
  },
  {
    id: 'NMX-012',
    title: 'The Noosphere Remembers',
    statement: 'The noosphere remembers what institutions forget.',
    domain: 'knowledge',
    operationalMeaning:
      'The knowledge layer preserves provenance, oral and documentary continuity, competing interpretations and historical sequence rather than silently normalizing one institutional narrative.'
  },
  {
    id: 'NMX-013',
    title: 'Produce the Record',
    statement: 'Words invite inquiry; records carry the weight.',
    domain: 'evidence',
    operationalMeaning:
      'When a claim can be tested, seek the originating document, image, inscription, ledger, filing, artifact, chronology or other primary record before relying on repetition or institutional shorthand.'
  },
  {
    id: 'NMX-014',
    title: 'Symbols Require Provenance',
    statement: 'A shared symbol is a clue, not a conclusion.',
    domain: 'evidence',
    operationalMeaning:
      'Visual similarity may trigger a provenance inquiry, but organizational identity, succession, authority or common origin requires dates, source records and a documented chain of transmission.'
  }
]

export const neoMaximById = (id: string): NeoMaxim | undefined =>
  neoMaxims.find((maxim) => maxim.id === id)
