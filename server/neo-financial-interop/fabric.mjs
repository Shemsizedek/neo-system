import {readFileSync} from 'node:fs';

// Boundary-only interop plan. No transport, signing, ledger posting or exchange.
// UI ownership is explicit: frontends consume their own APIs; never import each other's UI.
export const FINANCIAL_SURFACES = Object.freeze(['NEOPAY', 'COUNTERPAY', 'NEOBANK', 'NEOFX']);
const OPERATIONS = Object.freeze({
  BTC_DONATION_REQUEST: {service:'COUNTERPAY_RAIL',mode:'PREPARE_ONLY',scope:'payments:receive',assets:['BTC']},
  BTC_SALE_REQUEST: {service:'COUNTERPAY_RAIL',mode:'PREPARE_ONLY',scope:'payments:receive',assets:['BTC']},
  CES_CREDIT_TRANSFER_INTENT: {service:'NEO_BANK',next:'NIBIRU_RESERVE',mode:'PREPARE_ONLY',scope:'ces:prepare',assets:['CES_CREDIT','V_DOLLAR']},
  CONVERSION_QUOTE: {service:'NEO_CONVERSION',mode:'READ_ONLY',scope:'conversion:quote',assets:['BTC','XCP','NOMNI','CES_CREDIT','V_DOLLAR','USD']},
  FIAT_ONRAMP_INTENT: {service:'NEO_BANK',next:'NIBIRU_RESERVE',mode:'BLOCKED_PROVIDER_AND_REGULATORY_GATE',scope:'fiat:request',assets:['USD']},
  FIAT_OFFRAMP_INTENT: {service:'NEO_BANK',next:'NIBIRU_RESERVE',mode:'BLOCKED_PROVIDER_AND_REGULATORY_GATE',scope:'fiat:request',assets:['USD']},
  NIBIRU_RESERVE_STATUS: {service:'NIBIRU_RESERVE',mode:'READ_ONLY',scope:'reserve:read',assets:[]}
});
const REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,99}$/;
const IDEMPOTENCY = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const safe = s => typeof s === 'string' && REF.test(s);
const own = (obj, key) => Object.hasOwn(obj, key);

export function loadFinancialSurfaceContract(filepath = new URL('../../architecture/neo-financial-surface-boundaries.json', import.meta.url)) {
  return JSON.parse(readFileSync(filepath,'utf8'));
}

/** Build a deterministic, non-executable request plan. Claims of approval supplied by a
 * browser or bot are deliberately not accepted as evidence of authorization.
 * A trusted server-side mandate resolver must later validate actor/session/scopes.
 */
export function planFinancialOperation(input = {}, contract = loadFinancialSurfaceContract()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('invalid_intent');
  const keys = ['surface','operation','workspace','actorRef','accountRef','asset','idempotencyKey'];
  if (Object.keys(input).some(k => !keys.includes(k))) throw new Error('unexpected_intent_field');
  const {surface,operation,workspace,actorRef,accountRef,asset,idempotencyKey} = input;
  if (!own(contract.surfaces, surface)) throw new Error('unknown_surface');
  if (!own(OPERATIONS, operation)) throw new Error('unknown_operation');
  if (!['PERSONAL','TEAM'].includes(workspace)) throw new Error('workspace_isolation_required');
  if (!safe(actorRef) || !safe(accountRef) || !IDEMPOTENCY.test(idempotencyKey ?? '')) throw new Error('invalid_actor_account_or_idempotency_key');
  const policy=OPERATIONS[operation];
  if (policy.assets.length && !policy.assets.includes(asset)) throw new Error('asset_not_supported_by_operation');
  if (!policy.assets.length && asset !== undefined) throw new Error('unexpected_asset');
  if (contract.rules.productionExecutionEnabled !== false || contract.rules.agentsMaySpendUnrestricted !== false) throw new Error('unsafe_contract_configuration');
  return Object.freeze({
    surface,host:contract.surfaces[surface].host,operation,workspace,actorRef,accountRef,
    asset:asset ?? null,idempotencyKey,service:policy.service,nextService:policy.next ?? null,
    mode:policy.mode,requiredScope:policy.scope,approvalState:'NOT_VERIFIED',
    customerSignatureRequired:operation==='BTC_DONATION_REQUEST'||operation==='BTC_SALE_REQUEST',
    backendMandateRequired:true,executed:false,broadcast:false,converted:false,postedToLedger:false,
    publicRecordDataIncluded:false
  });
}

export function validateSurfaceSeparation(contract = loadFinancialSurfaceContract()) {
  const surfaces = Object.entries(contract.surfaces);
  if (surfaces.length !== 4) throw new Error('financial_surface_count_mismatch');
  const domains = new Set(),paths=new Set();
  for (const [key,surface] of surfaces) {
    if (!FINANCIAL_SURFACES.includes(key) || !surface.uiOwned || surface.uiChangeAuthorized!==false) throw new Error('surface_ownership_invariant');
    if (domains.has(surface.host) || !surface.host.endsWith('.holytemples.org')) throw new Error('surfaces_must_have_unique_hosts');
    domains.add(surface.host);
    for (const source of surface.sources){if(paths.has(source))throw new Error('surfaces_must_not_share_ui_source');paths.add(source)}
  }
  const r=contract.rules;
  if (!r.noUiEmbeddingOrCrossProductCss || !r.tenantIsolationRequired || !r.customerOwnsPaymentSignature || !r.noUnverifiedFiatOrTokenRedemption || !r.cesCreditsNotAssumedToBeCashOrReserves || r.productionExecutionEnabled!==false) throw new Error('surface_policy_invariant');
  return Object.freeze({ok:true,hosts:surfaces.map(([,s])=>s.host),sourceCount:paths.size});
}
