// NDC-003: Read-only Counterparty asset metadata adapter.
// Inject an explicitly configured HTTPS Counterparty API base URL.
// Never send keys, sign transactions, or infer legal rights from chain metadata.
export function createCounterpartyAssetReader({baseUrl,fetchImpl=fetch,timeoutMs=8000}={}) {
  if (typeof baseUrl !== 'string') throw new TypeError('baseUrl required');
  const base=new URL(baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) throw new Error('HTTPS API base URL required');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation required');
  return {
    async getAsset(assetName) {
      if (typeof assetName !== 'string' || !/^(?:[A-Z][A-Z0-9._-]{3,31}|A[0-9]{8,20})$/.test(assetName)) throw new Error('invalid Counterparty asset name');
      const endpoint=new URL(base.toString().replace(/\/$/,'')+'/v2/assets/'+encodeURIComponent(assetName));
      if (endpoint.origin !== base.origin) throw new Error('unexpected API origin');
      const response=await fetchImpl(endpoint.toString(),{method:'GET',headers:{accept:'application/json'},signal:AbortSignal.timeout(timeoutMs),redirect:'error'});
      if(!response.ok) throw new Error('Counterparty API request failed: HTTP '+response.status);
      const body=await response.json();
      if(!body || typeof body!=='object' || !('result' in body)) throw new Error('unexpected Counterparty API response');
      return {asset:assetName,source_url:endpoint.toString(),retrieved_at:new Date().toISOString(),raw_result:body.result,legal_rights_status:'unknown',verification_status:'source_checked',market_eligible:false,issuance_enabled:false};
    }
  };
}
