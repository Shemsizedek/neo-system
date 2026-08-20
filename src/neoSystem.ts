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
  }
]

export const foundationalPrinciples = [
  'Love',
  'Truth',
  'Peace',
  'Freedom',
  'Justice'
]
