import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v
const bytes=v=>Buffer.from(JSON.stringify(canonical(v)))

export function createCaIdentity({id,trustDomain='estate.neo',parentId=null,publicKey,kind='INTERMEDIATE_CA'}={}){
  if(!id||!publicKey)throw new TypeError('id and publicKey required')
  if(!['ROOT_CA','INTERMEDIATE_CA'].includes(kind))throw new Error('invalid_ca_kind')
  return {id,kind,trust_domain:trustDomain,parent_id:parentId,public_key:publicKey,status:'ACTIVE',created_at:now()}
}

export function createCertificateRequest(input={}){
  if(!input.subject_id||!input.subject_type||!input.public_key)throw new TypeError('subject_id, subject_type and public_key required')
  if(!['NODE','SERVICE'].includes(input.subject_type))throw new Error('invalid_subject_type')
  return {
    request_id:`CSR-${crypto.randomUUID()}`,
    subject_id:String(input.subject_id),
    subject_type:input.subject_type,
    public_key:String(input.public_key),
    trust_domain:input.trust_domain||'estate.neo',
    trust_zone:input.trust_zone||'COMPUTE',
    node_id:input.node_id||null,
    attestation_ref:input.attestation_ref||null,
    hardware_binding:clone(input.hardware_binding||null),
    requested_ttl_hours:Number(input.requested_ttl_hours||24),
    created_at:now(),
    status:'PENDING'
  }
}

export function validateCertificateRequest({request,policy,attestedNodes=[]}={}){
  if(!request||!policy)return {valid:false,reasons:['missing_input']}
  const reasons=[]
  if(request.trust_domain!==policy.trust_domain)reasons.push('trust_domain_mismatch')
  if(!policy.trust_zones.includes(request.trust_zone))reasons.push('invalid_trust_zone')
  if(request.requested_ttl_hours>policy.certificate.max_ttl_hours)reasons.push('ttl_exceeds_policy')
  if(request.subject_type==='NODE'&&policy.certificate.require_attested_node_for_node_identity){
    if(!attestedNodes.includes(request.subject_id))reasons.push('node_not_attested')
    if(!request.attestation_ref)reasons.push('attestation_reference_required')
  }
  if(request.subject_type==='SERVICE'&&policy.certificate.require_bound_node_for_service_identity&&!request.node_id)reasons.push('service_node_binding_required')
  return {valid:reasons.length===0,reasons}
}

export function issueIdentityCredential({request,issuer,issuerPrivateKey,policy,attestedNodes=[],serial=crypto.randomUUID(),issuedAt=new Date()}={}){
  const validation=validateCertificateRequest({request,policy,attestedNodes})
  if(!validation.valid)throw new Error(`request_rejected:${validation.reasons.join(',')}`)
  if(!issuer||issuer.status!=='ACTIVE')throw new Error('issuer_not_active')
  if(!issuerPrivateKey)throw new Error('issuer_private_key_required')
  const ttl=Math.min(request.requested_ttl_hours||policy.certificate.default_ttl_hours,policy.certificate.max_ttl_hours)
  const record={
    serial,
    issuer_id:issuer.id,
    subject_id:request.subject_id,
    subject_type:request.subject_type,
    public_key:request.public_key,
    trust_domain:request.trust_domain,
    trust_zone:request.trust_zone,
    node_id:request.node_id,
    attestation_ref:request.attestation_ref,
    hardware_binding:request.hardware_binding,
    not_before:new Date(issuedAt).toISOString(),
    not_after:new Date(+new Date(issuedAt)+ttl*3600000).toISOString(),
    status:'ACTIVE',
    format:'NEO-IDENTITY-CREDENTIAL-V1',
    x509_status:'ADAPTER_REQUIRED'
  }
  const signature=crypto.sign(null,bytes(record),issuerPrivateKey).toString('base64')
  return {...record,signature,algorithm:'Ed25519'}
}

export function verifyIdentityCredential({credential,issuer,at=new Date(),revocations=[]}={}){
  if(!credential||!issuer)return {valid:false,reason:'missing_input'}
  if(issuer.status!=='ACTIVE')return {valid:false,reason:'issuer_inactive'}
  if(revocations.some(r=>r.serial===credential.serial))return {valid:false,reason:'revoked'}
  const time=+new Date(at)
  if(time<+new Date(credential.not_before))return {valid:false,reason:'not_yet_valid'}
  if(time>=+new Date(credential.not_after))return {valid:false,reason:'expired'}
  const {signature,algorithm,...record}=credential
  let valid=false
  try{valid=crypto.verify(null,bytes(record),issuer.public_key,Buffer.from(signature,'base64'))}catch{}
  return {valid,reason:valid?'verified':'bad_signature',serial:credential.serial,subject_id:credential.subject_id}
}

export function revokeCredential({credential,reason='revoked',actor='neo-pki'}={}){
  if(!credential?.serial)throw new TypeError('credential required')
  return {serial:credential.serial,subject_id:credential.subject_id,reason,actor,revoked_at:now()}
}

export function rotationState({credential,policy,at=new Date()}={}){
  if(!credential)return {rotate:false,reason:'missing_credential'}
  const remaining=(+new Date(credential.not_after)-+new Date(at))/60000
  return {
    rotate:remaining<=policy.certificate.rotation_before_expiry_minutes,
    remaining_minutes:remaining,
    reason:remaining<=0?'expired':remaining<=policy.certificate.rotation_before_expiry_minutes?'rotation_window':'current'
  }
}

export function authorizeMtlsSession({clientCredential,serverCredential,issuer,policy,revocations=[],expectedZone,at=new Date()}={}){
  const client=verifyIdentityCredential({credential:clientCredential,issuer,at,revocations})
  const server=verifyIdentityCredential({credential:serverCredential,issuer,at,revocations})
  const sameDomain=clientCredential?.trust_domain===policy.trust_domain&&serverCredential?.trust_domain===policy.trust_domain
  const zoneOk=!expectedZone||serverCredential?.trust_zone===expectedZone
  return {
    authorized:Boolean(client.valid&&server.valid&&sameDomain&&zoneOk),
    client,
    server,
    same_trust_domain:sameDomain,
    zone_authorized:zoneOk
  }
}

export function buildX509IssuanceRequest({credentialRequest,credential}={}){
  if(!credentialRequest||!credential)throw new TypeError('request and credential required')
  const dnsNames=[]
  if(credentialRequest.subject_type==='SERVICE')dnsNames.push(`${credentialRequest.subject_id}.estate.neo`)
  return {
    adapter_contract:'NEO-X509-ISSUER-V1',
    subject_id:credential.subject_id,
    serial:credential.serial,
    public_key:credential.public_key,
    trust_domain:credential.trust_domain,
    trust_zone:credential.trust_zone,
    dns_names:dnsNames,
    not_before:credential.not_before,
    not_after:credential.not_after,
    private_key_handling:'KEY_NEVER_LEAVES_SUBJECT_OR_APPROVED_HSM',
    x509_certificate:null,
    issuance_status:'PENDING_EXTERNAL_OR_HSM_CA'
  }
}

export function pkiSnapshot({issuers=[],credentials=[],revocations=[]}={}){
  const nowMs=Date.now()
  return {
    estate:'Global Vast Estate',
    fabric:'NEO Sovereign Identity / CA',
    issuers:issuers.length,
    active_credentials:credentials.filter(c=>c.status==='ACTIVE'&&+new Date(c.not_after)>nowMs&&!revocations.some(r=>r.serial===c.serial)).length,
    revoked_credentials:revocations.length,
    trust_domains:[...new Set(credentials.map(c=>c.trust_domain).filter(Boolean))],
    generated_at:now()
  }
}
