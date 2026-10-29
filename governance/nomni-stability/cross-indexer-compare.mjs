// Project 144: compare two read-only NOMNI indexer responses.
// A cross-indexer match is NOT a second independently synchronized node.
function u(v) {
  if(typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) return String(v);
  if(typeof v === 'string' && /^(0|[1-9]\d*)$/.test(v)) return v;
  throw new Error('Invalid integer precision or missing supply');
}
export function compareNomniPublicIndexers(counterpartyAsset, counterpartyIssuances, tokenScanAsset, tokenScanIssuances) {
  const a=counterpartyAsset?.result, b=tokenScanAsset;
  if(!a||!b||a.asset!=='NOMNI'||b.asset!=='NOMNI') throw new Error('NOMNI asset required');
  const checks=[
    ['asset_id',u(a.asset_id),u(b.asset_id)],
    ['supply',u(a.supply),u(b.supply)],
    ['divisible',a.divisible,b.divisible],
    ['locked',a.locked,b.locked],
    ['owner',a.owner,b.owner],
    ['issuer',a.issuer,b.issuer],
  ];
  const mismatches=checks.filter(([,x,y])=>x!==y).map(([k])=>k);
  const p=counterpartyIssuances?.result, s=tokenScanIssuances?.data;
  if(!Array.isArray(p)||!Array.isArray(s) || counterpartyIssuances?.next_cursor != null ||
    tokenScanIssuances.total !== s.length || counterpartyIssuances.result_count!==p.length) {
    throw new Error('Complete issuance pages required');
  }
  const positiveP=p.filter(x=>x.asset==='NOMNI'&&x.status==='valid'&&u(x.quantity)!=='0');
  const positiveS=s.filter(x=>x.asset==='NOMNI'&&x.status==='valid'&&u(x.quantity)!=='0');
  if(positiveP.length!==1 || positiveS.length!==1) throw new Error('Unexpected positive NOMNI issuance count');
  for(const k of ['tx_hash','block_index','source']) {
    if(positiveP[0][k]!==positiveS[0][k]) mismatches.push('genesis_'+k);
  }
  if(u(positiveP[0].quantity)!==u(positiveS[0].quantity)) mismatches.push('genesis_quantity');
  if(positiveP.length !== positiveS.length || p.length !== s.length) mismatches.push('issuance_event_count');
  if(mismatches.length)throw new Error('Cross-indexer mismatch: '+mismatches.join(','));
  return Object.freeze({
    status:'CROSS_INDEXER_METADATA_MATCH',
    asset:'NOMNI',assetId:u(a.asset_id),supply:u(a.supply),
    genesisQuantity:u(positiveP[0].quantity),genesisBlock:positiveP[0].block_index,
    issuanceEventCount:p.length,
    secondSyncedNodeVerified:false,identicalBlockHeightVerified:false,
    independentBackendVerified:false,usdRedemptionVerified:false,
    legalReserveAssetsVerified:false,
  });
}
