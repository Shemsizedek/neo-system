export type GasReadiness = 'GREEN' | 'AMBER' | 'RED'
export type GasConfidence = 'LOW' | 'MODERATE' | 'HIGH'
export type GasSeverity = 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL'

export type GasDivision = {
  id: string
  name: string
  mission: string
  functions: string[]
  readiness: GasReadiness
  readinessScore: number
}

export type GasThreatCategory = {
  id: string
  name: string
  scope: string
  defensiveResponse: string
}

export type GasAssessment = {
  id: string
  title: string
  domain: string
  severity: GasSeverity
  confidence: GasConfidence
  knownFacts: string[]
  uncertainties: string[]
  alternatives: string[]
  defensiveActions: string[]
  sourceRefs: string[]
}

export const gasPrinciples = [
  'Intelligence before action',
  'Defense before force',
  'Civilian protection first',
  'Verify sources and state confidence',
  'Separate facts, analysis, uncertainty and alternatives',
  'Separate internal NEO authority from external governmental authority',
  'Preserve historical instruments; addenda carry later developments'
]

export const gasDivisions: GasDivision[] = [
  { id:'fusion', name:'Global Intelligence Fusion Center', mission:'Fuse lawful open-source, institutional, humanitarian, economic and infrastructure intelligence into decision-ready assessments.', functions:['Strategic warning','Source validation','Confidence scoring','Alternative-analysis review','Executive briefs','Indicator tracking'], readiness:'GREEN', readinessScore:92 },
  { id:'cyber', name:'Cyber Defense Directorate', mission:'Protect NEO digital systems and critical information services through defensive security engineering and incident readiness.', functions:['Threat intelligence','Security auditing','Incident-response planning','Identity governance','Continuity planning','Evidence preservation'], readiness:'GREEN', readinessScore:88 },
  { id:'maritime', name:'Maritime Security Directorate', mission:'Maintain maritime-domain awareness and resilience planning for ports, shipping, humanitarian movements and search-and-rescue support.', functions:['Maritime awareness','Port resilience','Search-and-rescue planning','Shipping-risk analysis','Humanitarian routing','Supply-route continuity'], readiness:'AMBER', readinessScore:68 },
  { id:'aerospace', name:'Aerospace & Air Security Directorate', mission:'Assess airspace, aerospace, communications and emergency aviation risks for defensive and humanitarian decision support.', functions:['Airspace monitoring','Emergency aviation planning','Satellite/open imagery analysis','Communications resilience','Disaster support','Navigation-risk assessment'], readiness:'AMBER', readinessScore:70 },
  { id:'land', name:'Land Security & Civil Defense Directorate', mission:'Coordinate non-offensive civil-defense, facility resilience, evacuation and emergency-preparedness analysis.', functions:['Civil-defense planning','Evacuation planning','Facility resilience','Community safety analysis','Emergency coordination','Shelter planning'], readiness:'GREEN', readinessScore:85 },
  { id:'logistics', name:'Logistics & Readiness Directorate', mission:'Measure readiness, continuity and humanitarian sustainment across NEO institutions without directing offensive operations.', functions:['Readiness scoring','Supply-chain resilience','Medical logistics','Continuity planning','Resource-gap analysis','Reserve planning'], readiness:'GREEN', readinessScore:87 },
  { id:'humanitarian', name:'Humanitarian Defense Directorate', mission:'Support disaster response, displacement analysis, medical logistics and protection of civilian life.', functions:['Disaster response','Displacement monitoring','Medical logistics','Food and water security','Shelter planning','Civilian-protection analysis'], readiness:'GREEN', readinessScore:90 },
  { id:'policy', name:'Defense Policy & Governance Directorate', mission:'Maintain policy, accountability, authority boundaries and external-law interoperability for all NEO-GAS functions.', functions:['Policy review','Authority mapping','Treaty and legal research','Use-of-force governance','Audit support','Civilian-oversight design'], readiness:'GREEN', readinessScore:91 }
]

export const gasThreatCategories: GasThreatCategory[] = [
  { id:'conflict', name:'Armed Conflict', scope:'Strategic warning, civilian exposure and continuity risk.', defensiveResponse:'Early warning, evacuation analysis, humanitarian coordination and lawful defensive planning.' },
  { id:'cyber', name:'Cyber Threats', scope:'System compromise, disruption, fraud and information-security risk.', defensiveResponse:'Hardening, detection, recovery, incident response and evidence preservation.' },
  { id:'infrastructure', name:'Infrastructure Disruption', scope:'Energy, communications, transport, water and critical-service interruption.', defensiveResponse:'Resilience assessment, redundancy planning and continuity support.' },
  { id:'disaster', name:'Natural & Public-Health Emergencies', scope:'Disaster, epidemic, displacement and resource-pressure risk.', defensiveResponse:'Preparedness, logistics, medical support and humanitarian coordination.' },
  { id:'economic', name:'Economic & Supply-Chain Instability', scope:'Financial shocks, shortages, sanctions exposure and logistics disruption.', defensiveResponse:'Scenario analysis, reserve planning and supply-chain diversification.' },
  { id:'information', name:'Information Manipulation', scope:'Misinformation, influence operations and decision-quality degradation.', defensiveResponse:'Source verification, provenance tracking and competing-hypothesis analysis.' },
  { id:'maritime', name:'Maritime Disruption', scope:'Port closures, route disruption, shipping risk and humanitarian access constraints.', defensiveResponse:'Route monitoring, continuity planning, search-and-rescue support and alternate logistics.' },
  { id:'aerospace', name:'Air & Space Service Disruption', scope:'Airspace restrictions, communications loss, navigation degradation and emergency aviation risk.', defensiveResponse:'Awareness, redundancy, emergency routing and communications resilience.' }
]

export const gasBoundary = 'NEO-GAS is a defensive intelligence and resilience platform. It does not implement autonomous targeting, attack execution, weapons construction, unlawful weapons acquisition, unauthorized surveillance, or independent governmental police/military authority.'

export function readinessSummary() {
  return gasDivisions.reduce((acc, division) => {
    acc[division.readiness] += 1
    return acc
  }, { GREEN:0, AMBER:0, RED:0 } as Record<GasReadiness, number>)
}

export function overallReadinessScore() {
  if (!gasDivisions.length) return 0
  return Math.round(gasDivisions.reduce((sum,d)=>sum+d.readinessScore,0)/gasDivisions.length)
}

export function validateAssessment(a: GasAssessment) {
  return Boolean(a.id && a.title && a.domain && a.knownFacts.length && a.defensiveActions.length && a.sourceRefs.length)
}
