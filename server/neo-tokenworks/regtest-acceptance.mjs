import crypto from 'node:crypto';
const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const hex=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
const key=x=>typeof x==='string'&&/^(02|03)[0-9a-f]{64}$/i.test(x);
const profiles=new Set(['PERSONAL','BUSINESS']);
/** No descriptor is imported or used for signing. Require Bitcoin Core getdescriptorinfo
 * and deriveaddresses results from an independently configured regtest node.
 * This function only binds caller-supplied evidence and NEVER certifies consensus validity.
 */
export function assessDescriptorEvidence({profile,descriptor,bitcoinCore,expectedAddress}={}) {
  if(!profile||!profiles.has(profile.kind)||profile.network!=='bitcoin-regtest-counterparty') return {status:'HOLD',reason:'REGTEST_PROFILE_REQUIRED'};
  if(!Array.isArray(profile.signers)||profile.signers.length<2||profile.signers.length>15||
    !Number.isSafeInteger(profile.threshold)||profile.threshold<2||profile.threshold>profile.signers.length) return {status:'HOLD',reason:'MULTISIG_POLICY_INVALID'};
  if(profile.kind==='BUSINESS'&&!String(profile.legalEntityId||'').trim()) return {status:'HOLD',reason:'ENTITY_REQUIRED'};
  if(!profile.signers.every(s=>key(s.publicKey))||new Set(profile.signers.map(s=>s.publicKey)).size!==profile.signers.length) return {status:'HOLD',reason:'PUBKEYS_INVALID'};
  if(typeof descriptor!=='string'||!/^wsh\(sortedmulti\([2-9][0-9]*,/.test(descriptor)||!descriptor.includes('#')) return {status:'HOLD',reason:'DESCRIPTOR_FORMAT_UNSUPPORTED'};
  if(!bitcoinCore||bitcoinCore.network!=='regtest'||bitcoinCore.isValid!==true||
    bitcoinCore.isSolvable!==true||!hex(bitcoinCore.bestBlockHash)||
    !Number.isSafeInteger(bitcoinCore.blockHeight)||bitcoinCore.blockHeight<0||
    !Array.isArray(bitcoinCore.derivedAddresses)||bitcoinCore.derivedAddresses.length!==1||
    bitcoinCore.derivedAddresses[0]!==expectedAddress||typeof expectedAddress!=='string'||!expectedAddress.startsWith('bcrt1')) return {status:'HOLD',reason:'CORE_DESCRIPTOR_EVIDENCE_MISSING'};
  // Reject unsupported cross-chain / mainnet and cannot attest to proof of actual signer possession.
  return {status:'REGTEST_DESCRIPTOR_EVIDENCE_RECORDED',policyDigest:digest(profile),descriptorDigest:digest(descriptor),address:expectedAddress,
    blockHeight:bitcoinCore.blockHeight,bestBlockHash:bitcoinCore.bestBlockHash,
    signerPossessionVerified:false,assetEncumbranceVerified:false,professionalLicensesVerified:false,
    bitcoinCoreEvidenceAuthenticated:false,signingEnabled:false,mainnetEnabled:false};
}
/** A separate registry result must bind profession, jurisdiction, authority, subject, 
 * retrieval time and outcome; explicit human approval remains mandatory. */
export function assessProfessionalRegistryEvidence({credential,registry,now=Date.now()}={}) {
  if(!credential||!registry||!['ACTIVE','GOOD_STANDING'].includes(registry.status)||
    !credential.personId||!credential.profession||!credential.jurisdiction||
    !credential.licenseNumber||!registry.issuer||!registry.evidenceId||
    registry.personId!==credential.personId||registry.profession!==credential.profession||
    registry.jurisdiction!==credential.jurisdiction||registry.licenseNumber!==credential.licenseNumber)
    return {status:'HOLD',reason:'CREDENTIAL_REGISTRY_MISMATCH'};
  const t=Date.parse(registry.checkedAt);
  if(!Number.isFinite(t)||t>now||now-t>24*3600_000) return {status:'HOLD',reason:'REGISTRY_STALE'};
  return {status:'REGISTRY_REVIEW_PENDING',evidenceDigest:digest({credential,registry}),
    independentRegistrySourceAuthenticated:false,humanApprovalRequired:true,
    authorizedToSign:false};
}
export function assessRegtestAcceptance({descriptor,assetState,scenarios}={}) {
  if(descriptor?.status!=='REGTEST_DESCRIPTOR_EVIDENCE_RECORDED'||!assetState||
     assetState.network!=='counterparty-regtest'||assetState.asset!=='NOMNI'||
     !assetState.independentIndexersAgree||!hex(assetState.blockHash))
    return {status:'HOLD',reason:'REGTEST_ASSET_PROOF_PENDING'};
  const required=['funding','unauthorized_spend_rejected','maturity_conditions','authorized_release','forfeiture_path','reorg_recovery','indexer_reconciliation'];
  if(!scenarios||!required.every(k=>scenarios[k]?.passed===true&&typeof scenarios[k].evidenceId==='string'&&scenarios[k].evidenceId.length>0))
    return {status:'HOLD',reason:'REGTEST_SCENARIOS_INCOMPLETE',remaining:required.filter(k=>!scenarios?.[k]?.passed)};
  return {status:'REGTEST_EVIDENCE_PACKAGE_READY_FOR_INDEPENDENT_REVIEW',evidenceDigest:digest({descriptor,assetState,scenarios}),
    securityAuditRequired:true,legalApprovalRequired:true,signingEnabled:false,mainnetEnabled:false};
}
