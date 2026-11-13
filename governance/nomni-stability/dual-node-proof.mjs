// Project 144: read-only, offline, same-block Counterparty v2 comparison.
// Separate node operation/ownership must be corroborated outside this pure function.
// It does not connect to any host or attest to current issuer rights or USD reserves.
const hex64 = s => typeof s === 'string' && /^[0-9a-f]{64}$/i.test(s);
const same = (a, b, label) => { if (a !== b) throw new Error(label + ' mismatch'); };
function validateSnapshot(s, label) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error(label + ': snapshot required');
  const server=s.server?.result, block=s.block?.result, asset=s.asset?.result, audit=s.audit;
  if (server?.network!=='mainnet' || server.server_ready!==true || server.ledger_state!=='Following') {
    throw new Error(label + ': not synchronized Counterparty mainnet node');
  }
  if (!Number.isSafeInteger(server.counterparty_height) ||
    server.counterparty_height!==server.backend_height ||
    block?.block_index!==server.counterparty_height) {
    throw new Error(label + ': block and backend height mismatch');
  }
  for (const field of ['block_hash','ledger_hash','txlist_hash','messages_hash']) {
    if (!hex64(block[field])) throw new Error(label + ': missing or invalid '+field);
  }
  if (asset?.asset!=='NOMNI' || String(asset?.asset_id)!=='6195210' ||
    String(asset?.supply)!=='900000000' || asset?.divisible!==false || asset?.locked!==true) {
    throw new Error(label + ': NOMNI supply/asset identity mismatch');
  }
  if (!audit || audit.outcome!=='SINGLE_NODE_PROTOCOL_RECONCILED_NOT_INDEPENDENTLY_ATTESTED' ||
    audit.holdingsSum!=='900000000' || audit.reportedSupply!=='900000000' ||
    audit.verifiedNodeHeight!==server.counterparty_height) {
    throw new Error(label + ': full single-node holdings and issuance audit required');
  }
  return {height:block.block_index,block,asset,audit};
}
export function compareNomniCounterpartyNodes(primary, secondary) {
  const a=validateSnapshot(primary,'primary'), b=validateSnapshot(secondary,'secondary');
  same(a.height,b.height,'block height');
  for(const key of ['block_hash','ledger_hash','txlist_hash','messages_hash']) {
    same(a.block[key].toLowerCase(),b.block[key].toLowerCase(),key);
  }
  for(const key of ['asset','asset_id','supply','divisible','locked','owner','issuer']) {
    same(String(a.asset[key]),String(b.asset[key]),'NOMNI '+key);
  }
  for(const key of ['issuanceQuantity','documentedDestructions','holdingsSum','holderBalances','openDispenserEscrow']) {
    same(a.audit[key],b.audit[key],'NOMNI ledger '+key);
  }
  return Object.freeze({
    outcome:'SAME_BLOCK_PROTOCOL_AND_HOLDINGS_MATCH_OPERATOR_INDEPENDENCE_PENDING',
    height:a.height,
    blockHash:a.block.block_hash.toLowerCase(),
    ledgerHash:a.block.ledger_hash.toLowerCase(),
    asset:'NOMNI',supply:'900000000',
    twoConsistentNodeResponses:true,
    independentlyOperatedSecondNodeVerified:false,
    independentOperatorEvidenceRequired:true,
    liveRedemptionAuthorized:false,
    eligibleUsdReservesVerified:false,
  });
}
