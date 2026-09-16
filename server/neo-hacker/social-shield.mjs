import crypto from 'node:crypto';

export const SOCIAL_EVENT_STATES=Object.freeze(['OBSERVATION','SUSPICION','CORROBORATED_SECURITY_EVENT']);
export const SOCIAL_SIGNAL_TYPES=Object.freeze([
  'LOGIN_OR_SESSION_CHANGE','OAUTH_GRANT_CHANGE','ADMIN_ROLE_CHANGE','RECOVERY_CHANGE',
  'SECURITY_SETTING_CHANGE','PROFILE_CHANGE','CONTENT_INTEGRITY_CHANGE','IMPERSONATION_SIGNAL','ABUSE_SIGNAL'
]);

const HIGH_RISK=new Set(['OAUTH_GRANT_CHANGE','ADMIN_ROLE_CHANGE','RECOVERY_CHANGE','SECURITY_SETTING_CHANGE']);

export function sanitizeSocialSignal(input={}) {
  const signalType=SOCIAL_SIGNAL_TYPES.includes(input.signalType)?input.signalType:'ABUSE_SIGNAL';
  const evidence=String(input.evidence??'').replaceAll('\u0000',' ').slice(0,8000);
  return Object.freeze({
    schema:'neo.social-shield.event.v1',
    platform:String(input.platform??'unknown').slice(0,80),
    accountRef:String(input.accountRef??'unknown').slice(0,160),
    signalType,
    observedAt:String(input.observedAt??new Date().toISOString()),
    sourceTrust:'UNTRUSTED_CONTENT',
    instructionPolicy:'DATA_ONLY_NO_EXECUTION',
    sinkPolicy:'ANALYSIS_ONLY_UNLESS_EXPLICITLY_AUTHORIZED',
    planDrift:'DENY',
    evidence,
    evidenceHash:crypto.createHash('sha256').update(evidence).digest('hex'),
    state:input.corroborated===true?'CORROBORATED_SECURITY_EVENT':(HIGH_RISK.has(signalType)?'SUSPICION':'OBSERVATION'),
    attribution:null,
    attributionPolicy:'NO_PERSON_OR_ORGANIZATION_ATTRIBUTION_WITHOUT_RELIABLE_EVIDENCE',
    human999RequiredForConsequentialAction:true
  });
}

export function evaluateSocialDelta(previous={},current={}) {
  const events=[];
  const fields=[
    ['sessions','LOGIN_OR_SESSION_CHANGE'],['oauthGrants','OAUTH_GRANT_CHANGE'],['admins','ADMIN_ROLE_CHANGE'],
    ['recovery','RECOVERY_CHANGE'],['securitySettings','SECURITY_SETTING_CHANGE'],['profile','PROFILE_CHANGE']
  ];
  for(const [field,signalType] of fields){
    const a=stable(previous[field]), b=stable(current[field]);
    if(a!==b) events.push(sanitizeSocialSignal({platform:current.platform,accountRef:current.accountRef,signalType,evidence:`${field} changed: ${digest(a)} -> ${digest(b)}`}));
  }
  return Object.freeze(events);
}

export function authorizeSocialAction(action,context={}) {
  const mutating=new Set(['REVOKE_SESSION','REVOKE_OAUTH','REMOVE_ADMIN','CHANGE_RECOVERY','CHANGE_SECURITY_SETTING','REPORT_IMPERSONATION']);
  if(!mutating.has(action)) return Object.freeze({allowed:true,reason:'read_only_analysis'});
  if(context.authenticated!==true) return Object.freeze({allowed:false,reason:'missing_authenticated'});
  if(context.explicitlyAuthorized!==true) return Object.freeze({allowed:false,reason:'missing_explicit_authorization'});
  if(context.stepUpVerified!==true) return Object.freeze({allowed:false,reason:'missing_step_up'});
  return Object.freeze({allowed:true,reason:'authorized'});
}

function stable(v){return JSON.stringify(v??null,Object.keys(v??{}).sort());}
function digest(v){return crypto.createHash('sha256').update(v).digest('hex').slice(0,16);}
