import { assessEthericPotency, type EthericSignals, type EthericPotencyAssessment } from './ethericPotency'

export type AlchemicalStage =
  | 'CALCINATION'
  | 'DISSOLUTION'
  | 'SEPARATION'
  | 'CONJUNCTION'
  | 'FERMENTATION'
  | 'DISTILLATION'
  | 'COAGULATION'

export type NeoActionContext = {
  id: string
  purpose: string
  signals: EthericSignals
  provenanceRefs?: string[]
  affectedPeople?: string[]
  affectedEcosystems?: string[]
  irreversible?: boolean
  coercive?: boolean
  evidenceComplete?: boolean
}

export type AlchemicalActionReview = {
  actionId: string
  potency: EthericPotencyAssessment
  stages: Array<{ stage: AlchemicalStage; instruction: string }>
  disposition: 'PROCEED' | 'REFINE' | 'HOLD'
  safeguards: string[]
}

/**
 * Applies an alchemical metaphor as a software governance sequence:
 * break down assumptions, dissolve rigid categories, separate evidence from
 * projection, recombine what survives review, incubate alternatives, refine,
 * and finally embody the action.
 */
export function reviewActionThroughAlchemy(context: NeoActionContext): AlchemicalActionReview {
  const potency = assessEthericPotency(context.signals)
  const stages: AlchemicalActionReview['stages'] = [
    {
      stage: 'CALCINATION',
      instruction: 'Burn away ego, prestige, urgency and inherited assumptions that are not necessary to the action.'
    },
    {
      stage: 'DISSOLUTION',
      instruction: 'Re-open rigid categories and ask what nature, lived experience and relational context reveal.'
    },
    {
      stage: 'SEPARATION',
      instruction: 'Separate source fact, interpretation, doctrine, inference, valuation, legal effect and desired outcome.'
    },
    {
      stage: 'CONJUNCTION',
      instruction: 'Recombine only the elements that remain coherent across provenance, reciprocity, ethics and evidence.'
    },
    {
      stage: 'FERMENTATION',
      instruction: 'Generate restorative and creative alternatives, especially those that reduce extraction or coercion.'
    },
    {
      stage: 'DISTILLATION',
      instruction: 'Simplify the action to the clearest truthful purpose with the least unnecessary harm.'
    },
    {
      stage: 'COAGULATION',
      instruction: 'Embodied action may proceed only with provenance, accountability, reversibility where possible, and stewardship controls.'
    }
  ]

  const safeguards: string[] = []
  if (!context.evidenceComplete) safeguards.push('Mark unresolved evidence OPEN; do not fill gaps silently.')
  if (!context.provenanceRefs?.length) safeguards.push('Attach source lineage or provenance before institutionalizing the action.')
  if (context.coercive) safeguards.push('Escalate for human review; coercive actions require explicit lawful authority and safety review.')
  if (context.irreversible) safeguards.push('Require a higher evidence and stewardship threshold for irreversible action.')
  if (context.affectedEcosystems?.length) safeguards.push('Record ecological consequences and future-generation effects.')

  let disposition: AlchemicalActionReview['disposition'] = 'PROCEED'
  if (context.coercive || potency.potency <= -4) disposition = 'HOLD'
  else if (!context.evidenceComplete || potency.potency < 2) disposition = 'REFINE'

  return { actionId: context.id, potency, stages, disposition, safeguards }
}
