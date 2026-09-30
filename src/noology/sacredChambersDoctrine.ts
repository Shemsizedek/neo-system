import type { NeoDoctrineRecord } from './doctrineRegistry'

/**
 * Sacred Chambers of Nun doctrine bundle.
 *
 * All entries here are NEO synthesis or operational controls created from the
 * Sacred Chambers development conversation. They are not ancient lexical
 * attestations, clinical diagnoses, or jurisdiction-specific legal conclusions.
 */
export const sacredChambersDoctrine: NeoDoctrineRecord[] = [
  {
    id: 'SCN-001',
    category: 'NEO_PHILOSOPHY',
    title: 'Sacred Chambers of Nun',
    teaching: 'The Sacred Chambers of Nun is the public umbrella for a Noological household, cultural and media framework with an inner Het-Haru chamber for wives, a middle Ninsat chamber for concubines or secondary consensual adult partners, and the MSTA Adept Chamber as the outer initiatory and educational layer.',
    operationalization: 'Preserve this chamber hierarchy consistently across NEO Oracle, NEOsync, GISS curriculum, NEO Society media and House of Shamuel documentation.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['sacred-chambers-of-nun','nunet','het-haru','ninsat','msta-adept-chamber','household-architecture']
  },
  {
    id: 'SCN-002',
    category: 'PRINCIPLE',
    title: 'Ninsat Is Modern NEO Neology',
    teaching: 'Ninsat is a modern Temple title inspired by ancient sacred-feminine archetypes; it is not an attested ancient word for concubine.',
    operationalization: 'Block any response that silently promotes Ninsat into an ancient Egyptian, Sumerian, Akkadian, Hebrew or other historical lexical claim. Label it explicitly as modern NEO neology.',
    evidenceClass: 'OPERATIONAL_CONTROL',
    tags: ['ninsat','neology','provenance','historical-boundary','language']
  },
  {
    id: 'SCN-003',
    category: 'NEO_PHILOSOPHY',
    title: 'NEO-Analysis as Structural Inquiry',
    teaching: 'NEO-analysis asks whether cognitive, relational, household, educational, economic or ritual architecture is misaligned before reducing a phenomenon to intrapsychic pathology.',
    operationalization: 'Use structural mapping as an interpretive lens while explicitly distinguishing project theory from licensed clinical diagnosis and evidence-based mental-health assessment.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['neo-analysis','noology','psychoanalysis','structure','psychology']
  },
  {
    id: 'SCN-004',
    category: 'ETHIC',
    title: 'Consent Survives Hierarchy',
    teaching: 'No religious, marital, economic, initiatory, tokenized or household rank extinguishes an adult partner’s bodily autonomy or right to refuse intimacy.',
    operationalization: 'Any Sacred Chambers workflow involving sexuality, dominance, housing, money, tokens, initiation or spiritual authority must preserve specific, voluntary, informed and revocable consent.',
    evidenceClass: 'OPERATIONAL_CONTROL',
    tags: ['consent','autonomy','ethics','sexuality','hierarchy','social-norms']
  },
  {
    id: 'SCN-005',
    category: 'SOCIAL_NORM',
    title: 'Plural-Household Responsibility Before Privilege',
    teaching: 'Polygynous or plural-household authority is legitimate within the project only when paired with reciprocal duties, transparency, provision, accountability and exit rights.',
    operationalization: 'Reject models that claim household authority while externalizing material, emotional or parental obligations onto women or children.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['polygyny','plural-household','responsibility','family','social-norms']
  },
  {
    id: 'SCN-006',
    category: 'PRINCIPLE',
    title: 'Temple Dirty Talk as Deliberate Neology',
    teaching: 'The Temple Dirty Talk Initiative names consensual adult plural-relationship experiences through modern NEO slang rather than pretending the terminology is ancient.',
    operationalization: 'Preserve Uniorgy, Trigasm, Domma, Sebalance, Sebatech, Polysync, Ritusubmit, Baaldominus, Master Dom and Baalfaux as project-defined modern coinages.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['temple-dirty-talk','neology','adult-media','language','polygyny']
  },
  {
    id: 'SCN-007',
    category: 'PRINCIPLE',
    title: 'Divine Feminine Economy Requires Material Security',
    teaching: 'Sacred-feminine rhetoric is incomplete without concrete household economics addressing food, housing, childcare, education, health, savings, inheritance and family capital.',
    operationalization: 'Require economic forecasts and household obligations to accompany ceremonial or relational commitments when producing House of Shamuel planning materials.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['divine-feminine-economy','household-finance','women','children','bridal-fund']
  },
  {
    id: 'SCN-008',
    category: 'RATIONALE',
    title: 'SEBABOND and DOWRYNOTE Are Project Instruments',
    teaching: 'SEBABOND represents the House of Shamuel concept of an eternal equitable obligation associated with wives; DOWRYNOTE represents a 3-, 5-, or 7-year equitable obligation concept associated with Ninsat relationships.',
    operationalization: 'Treat both as project-defined Bitcoin/Counterparty-oriented accounting or token concepts unless jurisdiction-specific review establishes a separate legal classification.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['sebabond','dowrynote','bitcoin','counterparty','house-of-shamuel','tokenization']
  },
  {
    id: 'SCN-009',
    category: 'MORAL',
    title: 'Advocacy Does Not Require Dehumanization',
    teaching: 'The Sacred Chambers may advocate its own polygynous household philosophy without classifying monogamous, celibate, lesbian, bisexual, gay or differently oriented adults as defective or requiring conversion.',
    operationalization: 'NEO social-norm outputs must distinguish preference and doctrine from coercive conversion, discrimination, degradation or erasure.',
    evidenceClass: 'OPERATIONAL_CONTROL',
    tags: ['dignity','social-norms','orientation','pluralism','non-coercion']
  },
  {
    id: 'SCN-010',
    category: 'UNDERSTANDING',
    title: 'Separate Sexuality, Religion, Economics and Law Before Synthesis',
    teaching: 'Sacred Chambers questions often combine erotic practice, spiritual doctrine, household economics and legal status; collapsing these dimensions creates category errors.',
    operationalization: 'NEO Algo and NEO Oracle should analyze each dimension independently, mark provenance and uncertainty, then recombine the result into a clearly labeled synthesis.',
    evidenceClass: 'OPERATIONAL_CONTROL',
    tags: ['category-discipline','neo-algo','neo-oracle','law','economics','sexuality','religion']
  }
]

export const sacredChambersByTag = (tag: string) =>
  sacredChambersDoctrine.filter((record) => record.tags.includes(tag))
