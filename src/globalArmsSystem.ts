export type GasReadiness = 'GREEN' | 'AMBER' | 'RED'

export type GasDivision = {
  id: string
  name: string
  mission: string
  functions: string[]
  readiness: GasReadiness
}

export type GasThreatCategory = {
  id: string
  name: string
  scope: string
  defensiveResponse: string
}

export const gasPrinciples = [
  'Intelligence before action',
  'Defense before force',
  'Civilian protection first',
  'Verify sources and state confidence',
  'Separate internal NEO authority from external governmental authority',
  'Preserve historical instruments; addenda carry later developments'
]

export const gasDivisions: GasDivision[] = [
  {
    id: 'fusion',
    name: 'Global Intelligence Fusion Center',
    mission: 'Fuse lawful open-source, institutional, humanitarian, economic and infrastructure intelligence into decision-ready assessments.',
    functions: ['Strategic warning', 'Source validation', 'Confidence scoring', 'Alternative-analysis review', 'Executive briefs'],
    readiness: 'GREEN'
  },
  {
    id: 'cyber',
    name: 'Cyber Defense Directorate',
    mission: 'Protect NEO digital systems and critical information services through defensive security engineering and incident readiness.',
    functions: ['Threat intelligence', 'Security auditing', 'Incident-response planning', 'Identity governance', 'Continuity planning'],
    readiness: 'GREEN'
  },
  {
    id: 'maritime',
    name: 'Maritime Security Directorate',
    mission: 'Maintain maritime-domain awareness and resilience planning for ports, shipping, humanitarian movements and search-and-rescue support.',
    functions: ['Maritime awareness', 'Port resilience', 'Search-and-rescue planning', 'Shipping-risk analysis', 'Humanitarian routing'],
    readiness: 'AMBER'
  },
  {
    id: 'aerospace',
    name: 'Aerospace & Air Security Directorate',
    mission: 'Assess airspace, aerospace, communications and emergency aviation risks for defensive and humanitarian decision support.',
    functions: ['Airspace monitoring', 'Emergency aviation planning', 'Satellite/open imagery analysis', 'Communications resilience', 'Disaster support'],
    readiness: 'AMBER'
  },
  {
    id: 'land',
    name: 'Land Security & Civil Defense Directorate',
    mission: 'Coordinate non-offensive civil-defense, facility resilience, evacuation and emergency-preparedness analysis.',
    functions: ['Civil-defense planning', 'Evacuation planning', 'Facility resilience', 'Community safety analysis', 'Emergency coordination'],
    readiness: 'GREEN'
  },
  {
    id: 'logistics',
    name: 'Logistics & Readiness Directorate',
    mission: 'Measure readiness, continuity and humanitarian sustainment across NEO institutions without directing offensive operations.',
    functions: ['Readiness scoring', 'Supply-chain resilience', 'Medical logistics', 'Continuity planning', 'Resource-gap analysis'],
    readiness: 'GREEN'
  },
  {
    id: 'humanitarian',
    name: 'Humanitarian Defense Directorate',
    mission: 'Support disaster response, displacement analysis, medical logistics and protection of civilian life.',
    functions: ['Disaster response', 'Displacement monitoring', 'Medical logistics', 'Food and water security', 'Shelter planning'],
    readiness: 'GREEN'
  },
  {
    id: 'policy',
    name: 'Defense Policy & Governance Directorate',
    mission: 'Maintain policy, accountability, authority boundaries and external-law interoperability for all NEO-GAS functions.',
    functions: ['Policy review', 'Authority mapping', 'Treaty and legal research', 'Rules of engagement governance', 'Audit support'],
    readiness: 'GREEN'
  }
]

export const gasThreatCategories: GasThreatCategory[] = [
  { id: 'conflict', name: 'Armed Conflict', scope: 'Strategic warning, civilian exposure and continuity risk.', defensiveResponse: 'Early warning, evacuation analysis, humanitarian coordination and lawful defensive planning.' },
  { id: 'cyber', name: 'Cyber Threats', scope: 'System compromise, disruption, fraud and information-security risk.', defensiveResponse: 'Hardening, detection, recovery, incident response and evidence preservation.' },
  { id: 'infrastructure', name: 'Infrastructure Disruption', scope: 'Energy, communications, transport, water and critical-service interruption.', defensiveResponse: 'Resilience assessment, redundancy planning and continuity support.' },
  { id: 'disaster', name: 'Natural & Public-Health Emergencies', scope: 'Disaster, epidemic, displacement and resource-pressure risk.', defensiveResponse: 'Preparedness, logistics, medical support and humanitarian coordination.' },
  { id: 'economic', name: 'Economic & Supply-Chain Instability', scope: 'Financial shocks, shortages, sanctions exposure and logistics disruption.', defensiveResponse: 'Scenario analysis, reserve planning and supply-chain diversification.' },
  { id: 'information', name: 'Information Manipulation', scope: 'Misinformation, influence operations and decision-quality degradation.', defensiveResponse: 'Source verification, provenance tracking and competing-hypothesis analysis.' }
]

export const gasBoundary =
  'NEO-GAS is a defensive intelligence and resilience platform. It does not implement autonomous targeting, attack execution, weapons construction, unlawful weapons acquisition, unauthorized surveillance, or independent governmental police/military authority.'

export function readinessSummary() {
  return gasDivisions.reduce(
    (acc, division) => {
      acc[division.readiness] += 1
      return acc
    },
    { GREEN: 0, AMBER: 0, RED: 0 } as Record<GasReadiness, number>
  )
}
