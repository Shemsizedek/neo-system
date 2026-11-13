import policy from '../../architecture/neo-bitcoin-execution-standard.json' with {type:'json'}

const permitted=Object.freeze({
  'core-only':[],
  'bitcoin-gateway':['bitcoin.observe','counterparty.observe'],
  'bitcoin-observer':['bitcoin.observe','counterparty.observe'],
  'external-signer':['bitcoin.observe'],
  'architecture-review-required':[],
  'vm-regtest':['bitcoin.observe','bvm.validate']
})
const capSet=new Set(['bitcoin.observe','counterparty.observe','bvm.validate'])
export function resolveNeoBitcoinCapability({scope,id,capability}={}){
  if(!['apps','systems','workstreams'].includes(scope)||typeof id!=='string'||!id||
     !capSet.has(capability))return Object.freeze({allowed:false,reason:'UNREGISTERED_OR_UNSUPPORTED'})
  const profile=policy[scope]?.[id]
  if(!Object.hasOwn(permitted,profile))return Object.freeze({allowed:false,reason:'UNREGISTERED_PROJECT'})
  if(!permitted[profile].includes(capability))return Object.freeze({allowed:false,reason:'CAPABILITY_NOT_GRANTED',profile})
  const route=policy.plans[capability]
  return Object.freeze({allowed:true,profile,route,signingEnabled:false,broadcastEnabled:false,mainnetVmEnabled:false})
}
export function auditNeoBitcoinRegistry({apps=[],systems=[]}={}){
  const missingApps=apps.filter(id=>!Object.hasOwn(policy.apps,id))
  const missingSystems=systems.filter(id=>!Object.hasOwn(policy.systems,id))
  const staleApps=Object.keys(policy.apps).filter(id=>!apps.includes(id))
  const staleSystems=Object.keys(policy.systems).filter(id=>!systems.includes(id))
  return Object.freeze({ok:!missingApps.length&&!missingSystems.length&&!staleApps.length&&!staleSystems.length,missingApps,missingSystems,staleApps,staleSystems})
}
