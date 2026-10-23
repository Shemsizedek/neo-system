import crypto from 'node:crypto'

const clone=v=>structuredClone(v)
const now=()=>new Date().toISOString()

export function registerSigner(input={}){
  if(!input.signer_id||!input.owner_id||!input.signer_type||!input.public_key)throw new TypeError('signer_id, owner_id, signer_type and public_key required')
  return {
    signer_id:String(input.signer_id),
    owner_id:String(input.owner_id),
    signer_type:String(input.signer_type),
    public_key:String(input.public_key),
    device_id:input.device_id||null,
    hardware_backed:Boolean(input.hardware_backed),
    user_presence_required:input.user_presence_required!==false,
    networks:[...new Set(input.networks||['BITCOIN_MAINNET','COUNTERPARTY_XCP'])],
    status:'ACTIVE',
    private_key_exported:false,
    registered_at:now()
  }
}

export function createPairingChallenge({signerId,deviceId,ttlSeconds=300}={}){
  if(!signerId||!deviceId)throw new TypeError('signerId and deviceId required')
  const issued=Date.now()
  return {
    pairing_id:`PAIR-${crypto.randomUUID()}`,
    signer_id:String(signerId),
    device_id:String(deviceId),
    nonce:crypto.randomBytes(32).toString('hex'),
    issued_at:new Date(issued).toISOString(),
    expires_at:new Date(issued+Math.min(Math.max(30,Number(ttlSeconds)),900)*1000).toISOString(),
    consumed:false
  }
}

export function verifyPairingChallenge({challenge,signature,verifySignature,at=new Date()}={}){
  if(!challenge||!signature||typeof verifySignature!=='function')return {verified:false,reason:'missing_input'}
  if(challenge.consumed)return {verified:false,reason:'already_consumed'}
  if(+new Date(at)>=+new Date(challenge.expires_at))return {verified:false,reason:'expired'}
  const payload=`${challenge.pairing_id}:${challenge.signer_id}:${challenge.device_id}:${challenge.nonce}`
  const verified=Boolean(verifySignature({payload,signature}))
  return {verified,reason:verified?'verified':'bad_signature',payload}
}

export function scoreDomainReputation({origin,signals={}}={}){
  const u=new URL(origin),host=u.hostname.toLowerCase()
  let score=100
  const findings=[]
  if(u.protocol!=='https:'){score-=30;findings.push('non_https')}
  if(host.includes('xn--')){score-=35;findings.push('punycode')}
  if(/seed|phrase|wallet-verify|airdrop|claim/.test(host)){score-=40;findings.push('suspicious_pattern')}
  if(signals.reportedPhishing===true){score-=80;findings.push('reported_phishing')}
  if(signals.newDomain===true){score-=10;findings.push('new_domain')}
  if(signals.allowlisted===true){score=Math.max(score,95);findings.push('allowlisted')}
  return {origin:u.origin,score:Math.max(0,Math.min(100,score)),risk:score<40?'CRITICAL':score<70?'HIGH':score<90?'MEDIUM':'LOW',findings}
}

export function inspectTransaction(input={}){
  const warnings=[]
  const kind=String(input.kind||'UNKNOWN').toUpperCase()
  const outputs=Array.isArray(input.outputs)?input.outputs:[]
  if(!['BITCOIN','COUNTERPARTY','PSBT'].includes(kind))warnings.push('unknown_transaction_kind')
  if(outputs.length>20)warnings.push('many_outputs')
  if(Number(input.fee_sats||0)>Number(input.max_fee_sats||1000000))warnings.push('fee_above_policy')
  if(input.destination&&input.source&&String(input.destination).toLowerCase()===String(input.source).toLowerCase())warnings.push('self_send')
  if(kind==='COUNTERPARTY'&&!input.asset)warnings.push('counterparty_asset_missing')
  if(input.asset&&input.expected_asset&&String(input.asset).toUpperCase()!==String(input.expected_asset).toUpperCase())warnings.push('asset_mismatch')
  if(input.amount!=null&&Number(input.amount)<=0)warnings.push('invalid_amount')
  return {kind,warnings,risk:warnings.length>=3?'CRITICAL':warnings.length===2?'HIGH':warnings.length===1?'MEDIUM':'LOW',broadcast:false}
}

export function guardianFirewall({origin,domainSignals={},transaction,signer,userPresent=false}={}){
  const domain=scoreDomainReputation({origin,signals:domainSignals})
  const tx=inspectTransaction(transaction||{})
  const reasons=[]
  if(domain.risk==='CRITICAL'||domain.risk==='HIGH')reasons.push('domain_risk')
  if(tx.risk==='CRITICAL'||tx.risk==='HIGH')reasons.push('transaction_risk')
  if(!signer||signer.status!=='ACTIVE')reasons.push('signer_unavailable')
  if(signer?.user_presence_required&&userPresent!==true)reasons.push('user_presence_required')
  const allowed=reasons.length===0
  return {allowed,reasons,domain,transaction:tx,signer_id:signer?.signer_id||null}
}

export async function requestSignature({origin,transaction,signer,guardian,adapter,userPresent=false}={}){
  if(typeof adapter?.sign!=='function')throw new Error('signer_adapter_required')
  const firewall=guardian||guardianFirewall({origin,transaction,signer,userPresent})
  if(!firewall.allowed)throw new Error(`guardian_block:${firewall.reasons.join(',')}`)
  const result=await adapter.sign({transaction:clone(transaction),signer:clone(signer),user_presence:true})
  if(result?.private_key||result?.seed_phrase)throw new Error('signer_secret_exposure_prohibited')
  return {
    signer_id:signer.signer_id,
    signed_payload:result?.signed_payload||null,
    psbt:result?.psbt||null,
    transaction_hex:result?.transaction_hex||null,
    signature:result?.signature||null,
    broadcast:false,
    signed_at:now()
  }
}

export function signerNetworkSnapshot({signers=[],pairings=[],blocked=0,approved=0}={}){
  return {
    estate:'Global Vast Estate',
    fabric:'NeoMask Live Signer & Guardian Security Network',
    signers:{total:signers.length,active:signers.filter(x=>x.status==='ACTIVE').length,hardware_backed:signers.filter(x=>x.hardware_backed).length},
    pairings:{total:pairings.length,active:pairings.filter(x=>!x.consumed&&+new Date(x.expires_at)>Date.now()).length},
    firewall:{blocked:Number(blocked),approved:Number(approved)},
    private_key_export:false,
    generated_at:now()
  }
}
