/** Read-only G033 probes. Dependencies must be operator-controlled, never taken from user requests. */
export async function probeCareersDatabase({query}={}){
 if(typeof query!=='function')return {connected:false,reason:'database_adapter_missing'}
 try{
  const result=await query('SELECT 1 AS probe',[])
  return result?.rows?.[0]?.probe===1?{connected:true,readOnlyProbe:true}:{connected:false,reason:'invalid_database_reply'}
 }catch{return {connected:false,reason:'database_probe_failed'}}
}
export async function probeCounterpartyAsset({asset,expectedIssuer,fetchAsset}={}){
 if(typeof fetchAsset!=='function')return {verified:false,reason:'counterparty_adapter_missing'}
 if(typeof asset!=='string'||!/^[A-Z0-9._-]{1,48}$/.test(asset)||typeof expectedIssuer!=='string'||!expectedIssuer)return {verified:false,reason:'invalid_request'}
 try{
  const result=await fetchAsset(asset)
  if(!result||result.asset!==asset||result.issuer!==expectedIssuer)return {verified:false,reason:'issuer_or_asset_mismatch'}
  if(result.network!=='mainnet'||result.sourceAuthenticated!==true)return {verified:false,reason:'untrusted_source'}
  return {verified:true,asset,issuer:expectedIssuer,verification:'authenticated-source-reported',payrollEligible:false,equityRightsVerified:false}
 }catch{return {verified:false,reason:'source_unavailable'}}
}
