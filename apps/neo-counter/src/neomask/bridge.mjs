export const NETWORKS=Object.freeze(['bitcoin','signet','regtest']);
export function walletStatus({session,network='bitcoin',providerAvailable=false}){
 if(!session||!Array.isArray(session.permissions)||!session.permissions.some(p=>p==='register'||p==='*'))return {ready:false,reason:'merchant_session_required'};
 if(!NETWORKS.includes(network))return {ready:false,reason:'unsupported_network'};
 if(!providerAvailable)return {ready:false,reason:'neomask_provider_not_installed'};
 return {ready:true,reason:'wallet_review_available',network};
}
export function checkReceiveClaim(claim,session){
 if(!session?.merchantId||claim?.merchantId!==session.merchantId)throw new Error('merchant_mismatch');
 if(!NETWORKS.includes(claim.network))throw new Error('unsupported_network');
 if(typeof claim.address!=='string'||claim.address.length<14||claim.address.length>100)throw new Error('invalid_address');
 if(claim.verified!==true||!claim.provenance)throw new Error('unverified_receive_address');
 return Object.freeze({address:claim.address,network:claim.network,provenance:claim.provenance});
}
export function reviewOnlyPayment(input,session){
 if(!session?.merchantId||input?.merchantId!==session.merchantId)throw new Error('merchant_mismatch');
 if(!NETWORKS.includes(input.network))throw new Error('unsupported_network');
 if(!['BTC','XCP','COUNTERPARTY_ASSET'].includes(input.rail))throw new Error('unsupported_rail');
 if(!/^[1-9][0-9]*$/.test(String(input.atomicUnits)))throw new Error('invalid_atomic_amount');
 if(typeof input.destination!=='string'||input.destination.length<14)throw new Error('invalid_destination');
 return Object.freeze({intentId:input.intentId,merchantId:input.merchantId,network:input.network,rail:input.rail,atomicUnits:String(input.atomicUnits),destination:input.destination,status:'review_required',canBroadcast:false,canSettle:false});
}