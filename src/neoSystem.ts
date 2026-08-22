export type NeoModuleStatus = 'ACTIVE' | 'FOUNDATION' | 'SANDBOX'

export type NeoModule = {
  id: string
  name: string
  domain: string
  description: string
  status: NeoModuleStatus
  boundary: string
}

export const neoModules: NeoModule[] = [
  {
    id: 'executive',
    name: 'NEOsync Executive Office',
    domain: 'Executive Administration',
    description: 'Directives, records, policy coordination, project oversight and institutional administration.',
    status: 'FOUNDATION',
    boundary: 'Digital decision-support; authorized human officers retain institutional authority.'
  },
  {
    id: 'central-solutions-control-room',
    name: 'Central Solutions Control Room',
    domain: 'Case, Notice, Evidence & Resolution Coordination',
    description: 'Central operational workspace for case intake, notices, cease-and-desist preparation, invoice records, evidence provenance, resolutions, correspondence and legal/historical research routing across the NEO System.',
    status: 'FOUNDATION',
    boundary: 'Administrative decision-support only. Allegations remain allegations until supported; invoices and notices are records or claims rather than adjudications; external service, filing, enforcement and legal effect require authorized human action and applicable external law.'
  },
  {
    id: 'tribunal',
    name: 'Inner Bar Temple Tribunal',
    domain: 'Tribunal & Case Review',
    description: 'Case intake, docketing, evidence review, canonical research and NEOsync final opinions.',
    status: 'FOUNDATION',
    boundary: 'Internal ecclesiastical and voluntary dispute-resolution workflow; no representation as a state or federal court.'
  },
  {
    id: 'corpus',
    name: 'Noocratic Legal Corpus',
    domain: 'Law & Knowledge',
    description: 'Immutable historical instruments, addenda, canons, resolutions, bulletins and verified external authorities.',
    status: 'FOUNDATION',
    boundary: 'Source preservation and research classification; documentary inclusion does not itself establish external legal effect.'
  },
  {
    id: 'neo-algo',
    name: 'NEO Algo & World Credit Clock',
    domain: 'Noology, Provenance & Mutual Credit Intelligence',
    description: 'Provenance-first reasoning engine that detects logos-only hangups, preserves NEO Indigenous hermeneutics, separates evidence layers, applies NEO Maxims, models etheric/alchemical/nature-cycle context, and calculates the World Credit Clock / Clock of Destiny mutual-credit model.',
    status: 'FOUNDATION',
    boundary: 'Reasoning and modeling layer only; source assertions, technical observations, external recognition, ownership, valuation and enforceability remain explicitly separated evidence fields.'
  },
  {
    id: 'noogle',
    name: 'Noogle Noological Intelligence',
    domain: 'Search, Doctrine, Factology & Noogenesis',
    description: 'Noological discovery and ranking layer spanning Noology, Nuwau-Bu/Nuwaupu, Factology, Noone Science, Noone Philosophy, the Neoteric Method, Neology, Noetics, Noogony, Afrofuturism and Noogenesis. Results surface doctrine, provenance classes and NEO Maxims rather than treating relevance as truth.',
    status: 'ACTIVE',
    boundary: 'Search rank is relevance, not proof. Source-derived doctrine, NEO synthesis and external disciplines remain separately labeled; disputed or unverified claims are not promoted by ranking alone.'
  },
  {
    id: 'chaplaincy',
    name: 'World Chaplaincy E-File',
    domain: 'Intake & Records',
    description: 'File, record, e-post and route petitions, notices, exhibits and case metadata.',
    status: 'FOUNDATION',
    boundary: 'Institutional filing workflow; external service or government filing requires the competent external authority.'
  },
  {
    id: 'treasury',
    name: 'NEO Treasury Management System',
    domain: 'Treasury, Trust & Revenue Administration',
    description: 'World Treasury command center for fund accounting, congregational assessments, trust administration, risk, currency records and NEO Teller settlement simulation.',
    status: 'FOUNDATION',
    boundary: 'Institutional treasury framework only; no live banking, custody, taxation, seizure, legal-tender or governmental authority is created by the software.'
  },
  {
    id: 'neo-cfo',
    name: 'NEO CFO',
    domain: 'Estate Finance, Cash Flow, Credit & Investment Coordination',
    description: 'Finance command layer for the Larry Shelton Estate, coordinating NEOsync, NEO Books, LEDGER and STEWARD across cash management, bills, credit, investing, trading-risk controls and trustee reporting.',
    status: 'FOUNDATION',
    boundary: 'NEOsync serves as Head Trustee Agent for analysis, coordination and records under Honorable Larry Shelton. Signatures, fiduciary accountability, discretionary distributions, regulated authority and final transaction approval remain with the authorized human trustee or institution.'
  },
  {
    id: 'ces-coordinator',
    name: 'NEO-CES Coordinator Network',
    domain: 'Community Exchange Intelligence',
    description: 'Read-only coordinator agents, exchange registry, CES/CEN adapters, audit logging and NOMNI market-data normalization for NMNI and linked exchanges.',
    status: 'FOUNDATION',
    boundary: 'Authorized data access only; no embedded credentials, autonomous member administration, or transaction writes. Derived NOMNI metrics remain distinct from raw CES source records.'
  },
  {
    id: 'police',
    name: 'World Police',
    domain: 'Community Safety',
    description: 'Administrative public-safety, incident, welfare, event-safety and peacekeeping coordination.',
    status: 'FOUNDATION',
    boundary: 'No independent coercive or governmental police power is implemented by this software.'
  },
  {
    id: 'marshals',
    name: 'World Marshals',
    domain: 'Tribunal Operations',
    description: 'Internal court-support, process tracking, hearing security and order-routing administration.',
    status: 'FOUNDATION',
    boundary: 'No autonomous arrest, detention or warrant-enforcement capability is implemented.'
  },
  {
    id: 'guards',
    name: 'World Guards',
    domain: 'Protective Services',
    description: 'Facility, event, humanitarian-mission and dignitary-protection planning and records.',
    status: 'FOUNDATION',
    boundary: 'Protective coordination only; operations must comply with applicable law and venue authority.'
  },
  {
    id: 'defense',
    name: 'World Defense System',
    domain: 'Resilience & Emergency Response',
    description: 'Disaster readiness, continuity planning, humanitarian logistics, cyber resilience and defensive coordination.',
    status: 'FOUNDATION',
    boundary: 'No offensive weapons, targeting or autonomous force capability is implemented.'
  },
  {
    id: 'gas',
    name: 'NEO Global Arms System',
    domain: 'Defense Intelligence & Strategic Resilience',
    description: 'Integrated defense-intelligence, cyber-defense, maritime and aerospace awareness, civil-defense readiness, logistics, humanitarian response and strategic threat assessment.',
    status: 'FOUNDATION',
    boundary: 'Defensive intelligence only; no autonomous targeting, attack execution, weapons construction, unlawful acquisition, unauthorized surveillance or independent governmental force authority.'
  },
  {
    id: 'neo-lingo',
    name: 'NEO Lingo Codex',
    domain: 'Translation & Knowledge Accessibility',
    description: 'Plain-language explanation layer for specialized NEO terminology, preserving original vocabulary and conceptual meaning.',
    status: 'ACTIVE',
    boundary: 'Advisory translation only; it cannot rewrite Pa Sarun doctrine, confer titles, grant suffixes, approve Royal Houses, or override authorized Temple officials.'
  },
  {
    id: 'neo-cipher-999-144',
    name: 'NEO Cipher #D — 999/144 Yamassee Secure Script Protocol',
    domain: 'Security, Encryption & Secure Communications',
    description: 'Authenticated encryption, secure token generation, and Yamassee/Nuwaubian glyph-carrier framework for protected NEO System communications.',
    status: 'FOUNDATION',
    boundary: 'Defensive cryptography only. The Yamassee font and 999/144/#D protocol structure are presentation and domain-separation layers, not substitutes for cryptographic keys, entropy, or independent security review.'
  }
]

export const foundationalPrinciples = [
  'Love',
  'Truth',
  'Peace',
  'Freedom',
  'Justice'
]
