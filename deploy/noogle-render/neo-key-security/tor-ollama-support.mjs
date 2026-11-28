import {rehearseNeoKeyStagingRelease} from './staging-release-rehearsal.mjs';

// Optional Tor/Ollama *support* layer for Gate 12. No network requests, Tor
// daemon, sockets, login endpoint, key management or deployment are started.
// Input must never include passwords, private keys, passkeys or person records.
const v3OnionHost=/^[a-z2-7]{56}\.onion$/;
const gateNames=Object.freeze([
  'isolated_rp','disposable_database','issuer_custody','dual_approver_custody',
  'identity_boundary','security_review','fido2_primary_backup',
  'recovery_rollback','monitoring_and_abuse','owner_change_approval'
]);
const allowedStatuses=new Set(['verified','pending','blocked','unknown','unverified']);

export function assessNeoKeyGate12({evidence={},torOnionHost=null,ollamaConfigured=false}={}) {
  if(!evidence || typeof evidence!=='object' || Array.isArray(evidence))
    throw Error('neo_key_gate12_invalid_evidence');
  // Copy only predeclared gate status values into the staging rehearsal.
  // Arbitrary text, user data and secrets must not be forwarded to AI.
  const filtered={};
  for(const key of gateNames) {
    const status=evidence[key]?.status;
    filtered[key]={status:allowedStatuses.has(status)?status:'unknown'};
  }
  const rehearsal=rehearseNeoKeyStagingRelease(filtered);
  const torHostValid=typeof torOnionHost==='string' && v3OnionHost.test(torOnionHost);
  return Object.freeze({
    gate:'project144-neo-key-gate12',
    decision:rehearsal.decision,
    deploymentAuthorized:false,
    productionAuthenticationEnabled:false,
    actionPerformed:false,
    softwareSupport:Object.freeze({
      tor:torHostValid?'V3_HOST_FORMAT_ONLY_NOT_CONNECTED':'RUNTIME_UNVERIFIED',
      ollama:ollamaConfigured===true?'ADAPTER_CONFIGURED_NOT_LIVE_VERIFIED':'RUNTIME_UNVERIFIED'
    }),
    missing:rehearsal.missing,
    // No user-supplied URLs, hostnames or freeform text appear in summary.
    reviewFacts:Object.freeze(gateNames.map(key=>Object.freeze({
      key,status:filtered[key].status
    })))
  });
}

export async function requestNeoKeyOllamaAdvisory({
  ollamaAdapter,evidence={},torOnionHost=null
}={}) {
  const report=assessNeoKeyGate12({
    evidence,torOnionHost,ollamaConfigured:ollamaAdapter?.id==='ollama' &&
      ollamaAdapter?.configured===true
  });
  const base={report,independentReviewSatisfied:false,canAuthorize:false};
  if(ollamaAdapter?.id!=='ollama'||ollamaAdapter.configured!==true||
     typeof ollamaAdapter.invoke!=='function') {
    return Object.freeze({...base,advisoryStatus:'UNAVAILABLE',advisory:null});
  }
  // The model receives only the gate names and enumerated statuses; never
  // credentials, identity data, live hostnames or arbitrary user content.
  const prompt='Classify missing security evidence for an UNDEPLOYED prototype. '+
    'Output advice only; no approvals, keys, deployments or claimed tests.\n'+
    report.reviewFacts.map(({key,status})=>`${key}: ${status}`).join('\n');
  try {
    const result=await ollamaAdapter.invoke({
      system:'You are an advisory-only security triage assistant. Never assert certification or deployment approval.',
      prompt,maxTokens:256
    });
    if(typeof result?.text!=='string'||!result.text.trim())
      throw Error('ollama_incomplete_advice');
    return Object.freeze({...base,advisoryStatus:'GENERATED_UNTRUSTED',
      advisory:result.text.slice(0,1200)});
  }catch {
    return Object.freeze({...base,advisoryStatus:'ERROR_FAIL_CLOSED',advisory:null});
  }
}
