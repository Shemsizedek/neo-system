// NMASK-035: authenticated, read-only BTC / Counterparty snapshot boundary.
// The principal must be issued by a trusted backend after OIDC verification.
// This module never accepts a client-provided "verified" flag as identity proof.
const NETWORKS=new Set(['bitcoin','signet','regtest']);
const ASSETS=new Set(['BTC','XCP']);
const MAX_AGE_MS=120000;
const INTEGER=/^(0|[1-9][0-9]*)$/;
export function authorizePortfolio({principal,origin,network}){
 if(!principal||principal.source!=='neo-pass-server'||typeof principal.subject!=='string'||!principal.subject||!principal.sessionId||principal.revoked===true)throw new Error('authenticated_principal_required');
 if(!Array.isArray(principal.scopes)||!principal.scopes.includes('wallet:read'))throw new Error('wallet_read_scope_required');
 if(typeof origin!=='string'||!/^https:\/\/[^/@\s]+(?::[0-9]+)?$/.test(origin))throw new Error('invalid_origin');
 if(!NETWORKS.has(network))throw new Error('unsupported_network');
 return Object.freeze({subject:principal.subject,sessionId:principal.sessionId,origin,network});
}
export function validatePortfolioSnapshot(snapshot,authorization,now=Date.now()){
 if(!snapshot||snapshot.subject!==authorization.subject||snapshot.sessionId!==authorization.sessionId||snapshot.network!==authorization.network)throw new Error('snapshot_identity_or_network_mismatch');
 if(snapshot.providerAuthenticated!==true||!snapshot.tipHash||!/^[a-fA-F0-9]{64}$/.test(snapshot.tipHash))throw new Error('unverified_chain_evidence');
 if(!Number.isSafeInteger(snapshot.asOf)||snapshot.asOf>now||now-snapshot.asOf>MAX_AGE_MS)throw new Error('stale_snapshot');
 if(!Array.isArray(snapshot.assets)||snapshot.assets.length>1000)throw new Error('invalid_assets');
 const seen=new Set();
 const assets=snapshot.assets.map(a=>{
  if(typeof a.asset!=='string'||!a.asset||seen.has(a.asset))throw new Error('invalid_or_duplicate_asset');
  seen.add(a.asset);
  if(!INTEGER.test(String(a.atomicUnits))||!Number.isInteger(a.divisibility)||a.divisibility<0||a.divisibility>18)throw new Error('invalid_asset_quantity');
  if(!ASSETS.has(a.asset)&&a.issuerVerified!==true)throw new Error('asset_issuer_unverified');
  return Object.freeze({asset:a.asset,atomicUnits:String(a.atomicUnits),divisibility:a.divisibility,issuerVerified:a.issuerVerified===true});
 });
 return Object.freeze({network:authorization.network,tipHash:snapshot.tipHash,asOf:snapshot.asOf,assets:Object.freeze(assets),spendEnabled:false});
}
export async function readPortfolio({principal,origin,network,reader,now=Date.now()}){
 const auth=authorizePortfolio({principal,origin,network});
 if(!reader||typeof reader.read!=='function')throw new Error('trusted_reader_unavailable');
 const result=await reader.read(auth);
 return validatePortfolioSnapshot(result,auth,now);
}
