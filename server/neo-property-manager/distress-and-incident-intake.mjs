/**
 * NCC-017: read-only acquisition intelligence and incident-evidence intake.
 * Records a source assertion without authenticating it, granting title, or authorizing entry.
 * No network, custody, filing, money movement, property entry or on-chain publication.
 */
import { sha256 } from './evidence-envelope.mjs';

export const SOURCE_KINDS=Object.freeze([
  'CITY_CODE_ENFORCEMENT','COUNTY_DEED','COUNTY_TAX_ACCOUNT','RECORDED_PLAT',
  'OFFICIAL_AUCTION','LENDER_OR_TRUSTEE_NOTICE','PROPERTY_PHOTOGRAPH',
  'FIRSTHAND_INCIDENT_REPORT','PUBLIC_LISTING','PRIVATE_OBSERVATION','OTHER'
]);
export const REPORTED_EVENT_KINDS=Object.freeze([
  'CONDITION','DAMAGE_DISCOVERED','ACCESS_DISPUTE','ALLEGED_FORCED_REMOVAL',
  'MAINTENANCE','OCCUPANCY_OBSERVATION','TITLE_CHANGE','PUBLIC_AGENCY_ACTION'
]);
function requiredText(v,label){
  if(typeof v!=='string'||v.trim()==='')throw new Error(label+' required');
  return v.trim();
}
const isDigest=s=>typeof s==='string' && /^[0-9a-f]{64}$/i.test(s);
export function intakeSource({
  assetRef,recordId,sourceKind,sourceRef,originalSha256,recordedAt,
  reportedEventKind='CONDITION',relation='UNATTRIBUTED',access='PRIVATE',
  note=null
}={}){
  requiredText(assetRef,'assetRef');requiredText(recordId,'recordId');
  requiredText(sourceRef,'sourceRef');requiredText(recordedAt,'recordedAt');
  if(!isDigest(originalSha256))throw new Error('originalSha256 must be a SHA-256 digest');
  if(!SOURCE_KINDS.includes(sourceKind))throw new Error('invalid source kind');
  if(!REPORTED_EVENT_KINDS.includes(reportedEventKind))throw new Error('invalid reported event kind');
  if(!['PRIVATE','PUBLIC_REFERENCE'].includes(access))throw new Error('invalid access tier');
  if(Number.isNaN(Date.parse(recordedAt)))throw new Error('invalid record time');
  const value=Object.freeze({
    schema:'neo.property-manager.intake.v1',assetRef,recordId,
    sourceKind,sourceRef,originalSha256:originalSha256.toLowerCase(),recordedAt,
    reportedEventKind,relation,access,note,
    independentCorroboration:'NOT_ASSESSED',
    officialSourceAuthentication:'NOT_ASSESSED',
    titleEffect:'NONE_INFERRED',
    legalServiceEffect:'NONE_INFERRED',
    propertyAccessAuthorization:'NOT_AUTHORIZED'
  });
  return value;
}

/** A private allegation is not converted to a verified event or public accusation. */
export function summarizeIncident(item){
  if(item?.schema!=='neo.property-manager.intake.v1')throw new Error('invalid evidence');
  return Object.freeze({
    recordId:item.recordId,assetRef:item.assetRef,
    description:item.reportedEventKind==='DAMAGE_DISCOVERED'
      ? 'Condition photographs reported by the source as damage discovered after an incident'
      : 'Source-provided incident or condition evidence',
    evidentiaryStatus:'SOURCE_ACCOUNT_ONLY',
    independentCausationConfirmed:false,
    suitableForPublicAccusation:false
  });
}
/** Flags an opportunity for qualified review only; never adjudicates a property. */
export function prioritizeReview(items=[]){
  if(!Array.isArray(items)||items.some(x=>x?.schema!=='neo.property-manager.intake.v1'))
    throw new Error('source records required');
  const all=items.map(x=>x.sourceKind);
  const officialPotential=all.some(x=>['CITY_CODE_ENFORCEMENT','COUNTY_TAX_ACCOUNT',
    'RECORDED_PLAT','OFFICIAL_AUCTION','COUNTY_DEED'].includes(x));
  return Object.freeze({
    sourceCount:items.length,
    reason:officialPotential?'OFFICIAL_SOURCE_PRESENT_FOR_AUTHENTICATION':'OBSERVATION_ONLY',
    officialDistressFindingAuthenticated:false,
    titleVerified:false,
    rightToEnter:false,
    automaticConsent:false,
    recommendedNextAction:'MANUAL_PRIMARY_SOURCE_AUTHENTICATION'
  });
}
/** Public receipt contains no allegation, address, source reference or original hash. */
export function privateRecordCommitment(record, secretNonce){
  if(record?.schema!=='neo.property-manager.intake.v1')throw new Error('invalid record');
  if(!isDigest(secretNonce))throw new Error('private 32-byte nonce required');
  return Object.freeze({schema:'neo.pm.public-reference.v1',
    commitment:sha256('NEO-PM-v1:'+sha256(record)+':'+secretNonce),
    status:'NOT_PUBLISHED'});
}
export function managerActivation({verifiedControl=false,signedMandate=false,
  regulatedFunctionsCleared=false,supervisorApproved=false}={}){
  return Object.freeze({
    evidenceIntakeEnabled:true,
    maintenanceActive:Boolean(verifiedControl&&signedMandate&&supervisorApproved),
    managedRentAndLeasingActive:Boolean(verifiedControl&&signedMandate&&
      regulatedFunctionsCleared&&supervisorApproved),
    propertyEntryAllowed:false,
    titleTransferred:false
  });
}
