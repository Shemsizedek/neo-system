import { verifySignedCheckpoint } from './checkpoint.mjs'
import { verifyIndependentPressWitness } from './witness.mjs'

// Independent verification pipeline: no asserted blockchain anchor,
// immutable timestamp, press association attestation, or legal conclusion.
export async function inspectPressCustody({
  caseId, custodyStore, checkpoint, checkpointPublicKey,
  witnessRecord, witness, trustedWitnessKeys, newsroomSignerId,
  now = () => Date.now()
} = {}) {
  const rejected = reason => Object.freeze({
    status: 'BLOCKED', reason, originalMediaVerified: false,
    checkpointSignatureVerified: false, independentWitnessVerified: false,
    externallyAnchored: false, publicationPermitted: false
  })
  if (!custodyStore || typeof custodyStore.verifyCase !== 'function' ||
      !caseId || !checkpoint || !checkpointPublicKey) return rejected('audit_configuration_missing')
  const local = custodyStore.verifyCase(caseId)
  if (!local.valid || !local.count || checkpoint.payload?.caseId !== caseId) {
    return rejected('local_custody_or_case_invalid')
  }
  const signed = verifySignedCheckpoint({
    receipt: checkpoint, trustedPublicKey: checkpointPublicKey, custodyStore
  })
  if (!signed.signatureVerified || !signed.matchesCurrentCustody) {
    return rejected('checkpoint_mismatch_or_stale')
  }
  const attest = await verifyIndependentPressWitness({
    checkpoint, witnessRecord, witness, trustedWitnessKeys, newsroomSignerId, now
  })
  if (!attest.independentWitnessVerified) return rejected(attest.reason || 'witness_not_independent')
  return Object.freeze({
    status: 'WITNESS_ACKNOWLEDGED',
    caseId, eventCount:local.count, custodyHead:local.head,
    checkpointSignatureVerified: true, independentWitnessVerified: true,
    externallyAnchored: false, publicationPermitted: false,
    limitation: 'External signed acknowledgment is verified; immutable public or Bitcoin anchoring is not established.'
  })
}
