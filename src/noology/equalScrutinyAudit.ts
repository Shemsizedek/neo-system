export type NarrativeSourceClass =
  | 'PRIMARY_COURT_RECORD'
  | 'PRIMARY_SOURCE_CORPUS'
  | 'GOVERNMENT_STATEMENT'
  | 'ACADEMIC_ANALYSIS'
  | 'ADVOCACY_CLASSIFICATION'
  | 'MEDIA_REPORT'
  | 'FORMER_MEMBER_TESTIMONY'
  | 'COMMUNITY_SELF_DESCRIPTION'
  | 'SECONDARY_SUMMARY'
  | 'UNRESOLVED'

export type ClaimDisposition =
  | 'DOCUMENTED'
  | 'SUPPORTED_INFERENCE'
  | 'CONTESTED'
  | 'ADVOCACY_LABEL'
  | 'ALLEGATION'
  | 'OPEN'
  | 'UNSUPPORTED'

export type NarrativeClaim = {
  id: string
  statement: string
  sourceClass: NarrativeSourceClass
  sourceRef?: string
  rootSourceId?: string
  date?: string
  disposition: ClaimDisposition
  independentlyCorroborated?: boolean
  contraryEvidenceRefs?: string[]
  notes?: string[]
}

export type EqualScrutinyFinding = {
  claimId: string
  scrutinyScore: number
  issues: string[]
  directives: string[]
}

export type NarrativeAuditReport = {
  findings: EqualScrutinyFinding[]
  duplicatedRootSourceGroups: Record<string,string[]>
  asymmetryFlags: string[]
  unresolvedQuestions: string[]
  principles: string[]
}

const uniq = <T>(items:T[]) => [...new Set(items)]

export function auditNarrativeClaims(claims:NarrativeClaim[]):NarrativeAuditReport {
  const byRoot:Record<string,string[]> = {}
  for (const c of claims) {
    const root = c.rootSourceId ?? c.id
    ;(byRoot[root] ??= []).push(c.id)
  }

  const findings = claims.map((c):EqualScrutinyFinding => {
    const issues:string[] = []
    const directives:string[] = []
    let score = 50

    if (c.sourceClass === 'PRIMARY_COURT_RECORD' || c.sourceClass === 'PRIMARY_SOURCE_CORPUS') score += 30
    if (c.independentlyCorroborated) score += 15
    if (c.sourceClass === 'ADVOCACY_CLASSIFICATION' || c.sourceClass === 'MEDIA_REPORT' || c.sourceClass === 'SECONDARY_SUMMARY') {
      issues.push('Interpretive or secondary source must not substitute for underlying evidence.')
      directives.push('Recover and cite the underlying document, testimony, exhibit, filing, or primary publication.')
      score -= 15
    }
    if (c.disposition === 'ADVOCACY_LABEL') {
      issues.push('Label is a source characterization, not an adjudicated factual finding.')
      directives.push('Decompose the label into factual propositions and test each proposition independently.')
      score -= 20
    }
    if (c.disposition === 'ALLEGATION') {
      directives.push('Preserve allegation status until supported by admissible or independently corroborated evidence.')
      score -= 15
    }
    if (c.disposition === 'CONTESTED') directives.push('Preserve supporting and contrary evidence in the same record.')
    if ((byRoot[c.rootSourceId ?? c.id]?.length ?? 0) > 1) {
      issues.push('Multiple repetitions may depend on the same root source.')
      directives.push('Count source independence, not citation count.')
      score -= 10
    }
    if (c.contraryEvidenceRefs?.length) directives.push('Resolve contrary evidence before promotion to high-confidence synthesis.')

    return { claimId:c.id, scrutinyScore:Math.max(0,Math.min(100,score)), issues, directives }
  })

  const asymmetryFlags:string[] = []
  const conventional = claims.filter(c=>['GOVERNMENT_STATEMENT','ACADEMIC_ANALYSIS','MEDIA_REPORT','ADVOCACY_CLASSIFICATION','SECONDARY_SUMMARY'].includes(c.sourceClass))
  const internal = claims.filter(c=>['PRIMARY_SOURCE_CORPUS','COMMUNITY_SELF_DESCRIPTION'].includes(c.sourceClass))
  if (conventional.some(c=>c.disposition==='DOCUMENTED') && internal.some(c=>c.disposition==='OPEN' || c.disposition==='CONTESTED')) {
    asymmetryFlags.push('Check whether conventional interpretations were promoted with less source scrutiny than community or primary-source counterclaims.')
  }

  return {
    findings,
    duplicatedRootSourceGroups:Object.fromEntries(Object.entries(byRoot).filter(([,ids])=>ids.length>1)),
    asymmetryFlags,
    unresolvedQuestions:uniq([
      'What is the earliest independently verifiable source for each material allegation?',
      'Which statements are court findings, which are party allegations, and which are advocacy or media classifications?',
      'Do repeated publications trace back to one root source or to independent evidence?',
      'What contrary evidence exists and was it addressed on the merits?',
      'Were conventional and Indigenous/community claims subjected to the same evidentiary threshold?',
      'For prosecution-bias hypotheses, what specific conduct, communication, selective-enforcement comparator, procedural irregularity, or admissible evidence supports motive or discriminatory effect?'
    ]),
    principles:[
      'Convention receives no evidentiary exemption.',
      'Community self-description receives accurate representation before external classification.',
      'A court judgment, party allegation, advocacy label, and media summary are different evidence classes.',
      'Ten repetitions of one root source are not ten independent corroborations.',
      'Investigate persecution or bias hypotheses without presuming them true.',
      'No claim is strengthened by suppressing contrary evidence.'
    ]
  }
}

export const yorkNuwaubianAuditSeed:NarrativeClaim[] = [
  {
    id:'YORK-APPEAL-2005',
    statement:'The Eleventh Circuit affirmed York’s convictions and 1,620-month sentence after review and oral argument.',
    sourceClass:'PRIMARY_COURT_RECORD',
    sourceRef:'United States v. York, 428 F.3d 1325 (11th Cir. 2005)',
    date:'2005-10-27',
    disposition:'DOCUMENTED',
    independentlyCorroborated:true
  },
  {
    id:'YORK-VENUE-PUBLICITY',
    statement:'The district court moved the trial from the Macon division after expressing grave concern about selecting a fair and impartial trial jury in the Macon/Atlanta media markets.',
    sourceClass:'PRIMARY_COURT_RECORD',
    sourceRef:'United States v. York, 428 F.3d 1325, pretrial-publicity discussion',
    disposition:'DOCUMENTED'
  },
  {
    id:'YORK-GRAND-JURY-BIAS-CLAIM',
    statement:'York argued that the Macon-area grand jury was tainted by pre-indictment publicity; the district court and Eleventh Circuit rejected dismissal because actual prejudice/substantial influence was not established.',
    sourceClass:'PRIMARY_COURT_RECORD',
    sourceRef:'United States v. York, 428 F.3d 1325',
    disposition:'DOCUMENTED'
  },
  {
    id:'YORK-PERSECUTION-HYPOTHESIS',
    statement:'The prosecution was materially influenced by religious, racial, political, institutional, or other discriminatory hostility toward the Nuwaubian movement.',
    sourceClass:'UNRESOLVED',
    disposition:'OPEN',
    notes:['Requires specific evidence of motive, discriminatory effect, selective enforcement, procedural irregularity, communications, comparators, or other probative facts.']
  }
]
