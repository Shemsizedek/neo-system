// Project 144: offline verification of a Counterparty NOMNI snapshot.
// Transport intentionally omitted; caller must collect read-only data from a synced node.
// No custody, signing, issuance, reserve attestations, or exchange permissions.
const int = value => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) ? BigInt(value) :
  (typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value)) ? BigInt(value) : null;
const allowedTypes = new Set(['balances','open_dispenser']);
function checkedRows(page, label) {
  if (!page || !Array.isArray(page.result) || page.next_cursor != null ||
      page.result_count !== page.result.length) {
    throw new Error(label + ': missing rows, unverified pagination, or incomplete response');
  }
  return page.result;
}
function requireState(value, message) { if (!value) throw new Error(message); }

/**
 * Analyze one consistent set of Counterparty mainnet read-only response bodies.
 * The caller must independently validate response origin / TLS, capture time and block height,
 * and repeat on an independent synchronized node before treating this as final attestation.
 */
export function auditNomniSupply({server, asset, issuances, holders, destructions, lastBlock}) {
  requireState(server?.result?.server_ready === true && server.result.network === 'mainnet' &&
    server.result.ledger_state === 'Following', 'Counterparty node is not ready on mainnet');
  const height = server.result.counterparty_height, bitcoin = server.result.backend_height;
  requireState(Number.isSafeInteger(height) && height > 0 && height === bitcoin &&
    lastBlock?.result?.block_index === height, 'Node heights must agree at a captured block');
  const a = asset?.result;
  requireState(a?.asset === 'NOMNI' && a?.divisible === false && a?.locked === true,
    'Existing NOMNI asset identity, divisibility or lock state mismatch');
  requireState(typeof a.asset_id === 'string' && /^\d+$/.test(a.asset_id), 'Missing asset ID');
  const supply = int(a.supply);
  requireState(supply !== null && supply > 0n, 'Missing onchain supply');
  const rows = checkedRows(issuances, 'issuances');
  const valid = rows.filter(x => x.asset === 'NOMNI' && x.status === 'valid');
  requireState(valid.length === rows.length && valid.length > 0, 'Invalid or non-NOMNI issuance records');
  const created = valid.filter(x => x.asset_events === 'creation');
  requireState(created.length === 1 && created[0].quantity === 900000000 &&
    created[0].block_index === 421813 && created[0].divisible === false,
    'Historic creation event differs from verified NOMNI genesis issuance');
  let issued=0n;
  for (const row of valid) {
    const amount=int(row.quantity);
    requireState(amount !== null, 'Invalid issuance quantity');
    issued+=amount;
  }
  const destroyRows=checkedRows(destructions, 'destructions');
  let destroyed=0n;
  for(const row of destroyRows){
    requireState(row.asset === 'NOMNI' && row.status === 'valid', 'Invalid destruction record');
    const n=int(row.quantity);
    requireState(n !== null, 'Invalid destruction quantity');
    destroyed+=n;
  }
  requireState(issued >= destroyed && issued-destroyed === supply,
    'Issuance minus documented destruction does not equal asset supply');

  const holdingRows=checkedRows(holders, 'holders');
  let allocated=0n, unescrowed=0n, dispenserEscrow=0n;
  for(const row of holdingRows) {
    requireState(row.asset === 'NOMNI' && allowedTypes.has(row.holding_type),
      'Unexpected or unsupported holder category: human review required');
    const n=int(row.quantity);
    requireState(n !== null && n > 0n, 'Invalid holder quantity');
    allocated+=n;
    if(row.holding_type === 'balances')unescrowed+=n;
    else dispenserEscrow+=n;
  }
  requireState(allocated === supply, 'Unreconciled NOMNI outstanding holdings / escrow');

  return Object.freeze({
    outcome:'SINGLE_NODE_PROTOCOL_RECONCILED_NOT_INDEPENDENTLY_ATTESTED',
    asset:'NOMNI', assetId:a.asset_id, network:'bitcoin-counterparty',
    nodeStatus:'Following', verifiedNodeHeight:height,
    genesisBlock:created[0].block_index,
    reportedSupply:supply.toString(),validIssuances:valid.length,
    issuanceQuantity:issued.toString(),documentedDestructions:destroyed.toString(),
    holdersRows:holdingRows.length,holderBalances:unescrowed.toString(),
    openDispenserEscrow:dispenserEscrow.toString(),
    holdingsSum:allocated.toString(),unexplainedUnits:'0',
    historicalEightHundredMillionOffering:'HISTORICAL_PROPOSAL_NOT_CHAIN_SUPPLY',
    secondIndependentNodeVerified:false,
    eligibleUsdReservesVerified:false,
    issuerLicensingVerified:false,
    nomniRedemptionAuthorized:false,
    vDollarReserveBackingVerified:false,
    coinbaseNomniSupport:false,
  });
}
