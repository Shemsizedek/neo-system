/**
 * NEOCAST-002 — fail-closed original-programming pilot policy.
 * No host access, stream upload, deployment, payments or network operation.
 * Even a passing policy check never certifies real-world rights or playback.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const MANIFEST = new URL('../../docs/neocast/pilots/world-temple-education-001.json', import.meta.url);
const SHA256 = /^[a-f0-9]{64}$/i;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const APPROVALS = [
  ['content.sourceAssetProvided','Source material must be supplied and identified'],
  ['content.ownerIdentityVerified','Rights owner must be verified'],
  ['content.ownerEvidenceReference','Rights owner evidence reference required'],
  ['content.participantsAndLocationsConsented','On-camera/voice and venue consents required'],
  ['content.thirdPartyMaterialCleared','Third-party sound/video/images must be cleared'],
  ['rights.ownedOrLicensed','Ownership or applicable license required'],
  ['rights.liveDistributionAuthorized','Explicit live-distribution right required'],
  ['rights.signedLicenseEvidenceReference','Signed distribution evidence required'],
  ['schedule.startIso','Confirmed, offset-aware broadcast start required'],
  ['schedule.operatorIdentified','Approved operator must be identified'],
  ['schedule.operatorApprovalReference','Operator approval evidence required'],
  ['delivery.persistentOriginVerified','Real persistent origin must be verified'],
  ['delivery.actualEndToEndPlaybackVerified','Real approved viewer playback required'],
  ['delivery.audienceIsolationTested','Authorized-audience isolation test required'],
  ['delivery.revocationOrTakedownTested','Emergency stoppage and revocation test required'],
  ['delivery.measuredEgressMbps','Measured usable egress capacity required'],
  ['delivery.receiverNetworkEvidenceReference','Real playback evidence record required'],
  ['governance.neoLawApproved','NEO Law rights/privacy review required'],
  ['governance.budgetApproved','Budget/cost approval required'],
  ['governance.siteNetworkOwnerAuthorized','Network/site authorization required'],
  ['governance.emergencyContactVerified','Incident escalation owner required']
];
const at = (v,path) => path.split('.').reduce((x,k)=>x?.[k],v);
const round = n => Math.round(n*1000)/1000;

export function estimateCapacity({concurrentViewers,averageTotalBitrateKbps,egressHeadroomFactor,ingestHeadroomFactor},durationMinutes) {
  if (!Number.isSafeInteger(concurrentViewers) || concurrentViewers < 1 || concurrentViewers > 100000 ||
    !Number.isSafeInteger(averageTotalBitrateKbps) || averageTotalBitrateKbps < 64 || averageTotalBitrateKbps > 50000 ||
    !Number.isFinite(egressHeadroomFactor) || egressHeadroomFactor < 1 || egressHeadroomFactor > 3 ||
    !Number.isFinite(ingestHeadroomFactor) || ingestHeadroomFactor < 1 || ingestHeadroomFactor > 3 ||
    !Number.isSafeInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
      throw new TypeError('invalid_capacity_assumptions');
  }
  const bitrateMbps = averageTotalBitrateKbps / 1000;
  const sustainedMbps = bitrateMbps * concurrentViewers;
  const mediaGb = averageTotalBitrateKbps * durationMinutes * 60 * concurrentViewers / 8_000_000;
  return {
    concurrentViewers,
    estimatedViewerBitrateKbps:averageTotalBitrateKbps,
    durationMinutes,
    estimatedSustainedOriginEgressMbps:round(sustainedMbps),
    recommendedOriginEgressCapacityMbps:round(sustainedMbps * egressHeadroomFactor),
    recommendedPublisherUploadMbps:round(bitrateMbps * ingestHeadroomFactor),
    estimatedMediaTransferGBDecimal:round(mediaGb),
    provisionedTransferAllowanceGBDecimal:round(mediaGb * egressHeadroomFactor),
    measured:false,
    costEstimated:false,
    notes:'Sizing assumptions only; CDN, transcoding, source bitrate variance and contractual traffic charges require independent verification.'
  };
}

export function assessOriginalPilot(pilot) {
  const violations = [];
  if (pilot?.schema !== 'neo.neocast.original-pilot/v1') violations.push('invalid_schema');
  if (pilot?.brand !== 'Neofinity' || pilot?.service !== 'NeoCast') violations.push('brand_service_mismatch');
  if (!ID.test(pilot?.pilotId || '')) violations.push('invalid_pilot_id');
  if (!['draft','preflight'].includes(pilot?.phase)) violations.push('public_or_unknown_phase_forbidden_in_gate_002');
  if (pilot?.schedule?.timezone !== 'America/Chicago') violations.push('pilot_timezone_mismatch');
  if (pilot?.delivery?.mode !== 'none' || pilot?.delivery?.publicEndpoint != null) {
    violations.push('public_media_endpoint_forbidden_in_gate_002');
  }
  if (!pilot?.release || Object.values(pilot.release).some(x=>x!==false)) {
    violations.push('publication_or_payment_claim_forbidden');
  }
  if (pilot?.governance?.newPaidResourcesAuthorized !== false) violations.push('new_paid_resource_approval_forbidden');
  if (pilot?.rights?.advertisingOrMonetizationAuthorized !== false) violations.push('monetization_forbidden_in_gate_002');
  const timestamp = pilot?.schedule?.startIso;
  if (timestamp !== null && (!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?[+-]\d\d:\d\d$/.test(timestamp) ||
      Number.isNaN(new Date(timestamp).getTime()))) violations.push('schedule_requires_valid_offset_datetime');
  const hash = pilot?.content?.sourceAssetSha256;
  if (hash !== null && !SHA256.test(hash)) violations.push('source_hash_must_be_sha256_hex');
  if (pilot?.rights?.ownedOrLicensed !== true && pilot?.rights?.authorizedTerritories?.length > 0) {
    violations.push('unlicensed_distribution_cannot_specify_rights_territories');
  }
  if (!Array.isArray(pilot?.rights?.authorizedTerritories)) violations.push('rights_territories_must_be_array');

  let capacityEstimate = null;
  try { capacityEstimate = estimateCapacity(pilot?.audienceCapacityEstimate,pilot?.schedule?.durationMinutes); }
  catch { violations.push('invalid_capacity_assumptions'); }

  const unmet = APPROVALS.filter(([key])=> {
    const value = at(pilot,key);
    if (key === 'schedule.startIso') return !value;
    if (key === 'delivery.measuredEgressMbps') return !Number.isFinite(value) || value <= 0;
    if (key.includes('Reference')) return typeof value !== 'string' || value.trim().length < 6;
    return value !== true;
  }).map(([key,message])=>({key,message}));

  // Signed proof is not verified by checking source-controlled booleans.
  return {
    pilotId:pilot?.pilotId ?? null,
    gate:'NEOCAST-002',
    policyConsistent:violations.length===0,
    preflightStatus:violations.length?'BLOCKED':'DRAFT_ACCEPTED',
    contentAndRightsGaps:unmet,
    capacityEstimate,
    publicBroadcastAuthorized:false,
    actualOnNetworkAcceptanceVerified:false,
    operationalProofChecked:false,
    expectedPublicListener:false,
    violations
  };
}
export function loadCanonicalPilot() {
  return JSON.parse(readFileSync(MANIFEST,'utf8'));
}
const self = process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(self) {
  const result = assessOriginalPilot(loadCanonicalPilot());
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.policyConsistent || result.publicBroadcastAuthorized) process.exitCode=1;
}
