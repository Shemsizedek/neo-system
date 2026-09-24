import accountRegistry from '../../registry/social-authorized-account-sets.json' with {type:'json'}

export function resolveAuthorizedAccounts(destination,payload,{registry=accountRegistry}={}) {
  const lane=payload?.contentLane
  if (!lane) throw new Error('content_lane_required')
  const set=registry?.sets?.[lane]
  if (!set) throw new Error(`authorized_account_set_missing:${lane}`)
  const accounts=set[destination]
  if (!Array.isArray(accounts)) throw new Error(`authorized_destination_missing:${lane}:${destination}`)
  if (accounts.length===0) throw new Error(`authorized_destination_requires_handoff:${lane}:${destination}`)
  return accounts.map(account=>({...account}))
}

export function createAuthorizedAccountResolver(options={}) {
  return async (destination,payload)=>resolveAuthorizedAccounts(destination,payload,options)
}
