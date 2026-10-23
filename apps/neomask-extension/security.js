const PERMS=new Set(['accounts','read','transactions','sign'])
const stores=new Map()
const normalizeOrigin=o=>{const u=new URL(o);if(!['https:','http:'].includes(u.protocol))throw new Error('Unsupported origin');return u.origin}

export function createPermissionStore(){
  return {
    grant(origin,request={}){
      origin=normalizeOrigin(origin);const requested=(request.permissions||[]).filter(x=>PERMS.has(x))
      const current=stores.get(origin)||{permissions:[],accounts:[]}
      const next={...current,permissions:[...new Set([...current.permissions,...requested])],accounts:Array.isArray(request.accounts)?request.accounts:current.accounts}
      stores.set(origin,next);return structuredClone(next)
    },
    get(origin){origin=normalizeOrigin(origin);return structuredClone(stores.get(origin)||{permissions:[],accounts:[]})},
    revoke(origin,request={}){origin=normalizeOrigin(origin);const current=stores.get(origin)||{permissions:[],accounts:[]};const remove=new Set(request.permissions||[]);const next={...current,permissions:current.permissions.filter(x=>!remove.has(x))};stores.set(origin,next);return structuredClone(next)},
    require(origin,permission){origin=normalizeOrigin(origin);if(!(stores.get(origin)?.permissions||[]).includes(permission))throw new Error(`Permission required: ${permission}`)},
    accounts(origin){origin=normalizeOrigin(origin);return [...(stores.get(origin)?.accounts||[])]}
  }
}

export function simulateTransaction(input={}){
  const kind=String(input.kind||'UNKNOWN').toUpperCase()
  const warnings=[]
  const amount=Number(input.amount??input.quantity??0)
  const fee=Number(input.fee_sats??input.fee??0)
  if(amount<0)warnings.push('negative_amount')
  if(fee<0)warnings.push('negative_fee')
  if(kind==='COUNTERPARTY'&&!input.asset)warnings.push('counterparty_asset_missing')
  if(input.destination&&input.source&&String(input.destination).toLowerCase()===String(input.source).toLowerCase())warnings.push('self_send')
  if(input.outputs&&Array.isArray(input.outputs)&&input.outputs.length>20)warnings.push('many_outputs')
  return {kind,asset:input.asset||'BTC',amount,fee,destination:input.destination||null,warnings,risk:warnings.length>=2?'HIGH':warnings.length?'MEDIUM':'LOW',broadcast:false,private_key_exposed:false}
}

export function guardianDecision({origin,simulation,request}={}){
  const host=new URL(origin).hostname.toLowerCase()
  if(host==='localhost'||host.endsWith('.localhost'))return {allowed:true,reason:'local_development'}
  if(request?.guardian_block===true)return {allowed:false,reason:'explicit_guardian_block'}
  if(simulation?.risk==='HIGH')return {allowed:false,reason:'high_risk_transaction'}
  if(/xn--|wallet-verify|seed-phrase|claim-airdrop/.test(host))return {allowed:false,reason:'suspicious_domain_pattern'}
  return {allowed:true,reason:simulation?.risk==='MEDIUM'?'user_review_required':'policy_pass'}
}
