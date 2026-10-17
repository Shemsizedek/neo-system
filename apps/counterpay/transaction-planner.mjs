// CounterPay transaction intent planner. Does NOT compose valid on-chain transactions.
import {ensurePublicAddress} from './wallet-engine.mjs';
const ASSET=/^(?:BTC|XCP|[A-Z][A-Z0-9._-]{0,31}|A[0-9]{1,20})$/;
export function planTransfer({network,source,destination,asset,quantity}) {
  if(!['mainnet','testnet'].includes(network)) throw Error('Unsupported network');
  ensurePublicAddress(source,network);
  ensurePublicAddress(destination,network);
  if(source===destination) throw Error('Source and destination must differ');
  if(typeof asset!=='string'||!ASSET.test(asset))throw Error('Invalid asset symbol');
  if(typeof quantity!=='string'||!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(quantity)||!/[1-9]/.test(quantity.replace('.','')))throw Error('Invalid positive amount');
  return Object.freeze({
    schema:'counterpay.transfer-intent.v1', network, source, destination, asset, quantity,
    status:'PREVIEW_ONLY', signed:false, broadcast:false,
    disclaimer:'Not a Counterparty compose result, Bitcoin PSBT, or spend authorization.'
  });
}
export function planDexInspection({network,asset}) {
  if(!['mainnet','testnet'].includes(network))throw Error('Unsupported network');
  if(typeof asset!=='string'||!ASSET.test(asset))throw Error('Invalid asset symbol');
  return {schema:'counterpay.dex-query.v1',network,asset,mode:'READ_ONLY',orders:[],source:'Not queried'};
}
export function evidenceEnvelope(intent,reference) {
  if(intent?.schema!=='counterpay.transfer-intent.v1'||intent.status!=='PREVIEW_ONLY')throw Error('Only preview transfer intents supported');
  if(typeof reference!=='string'||reference.length>128||!/^[a-zA-Z0-9._:-]+$/.test(reference))throw Error('Invalid evidence reference');
  return {schema:'neo.crown-chain.evidence.v1',origin:'CounterPay',reference,network:intent.network,asset:intent.asset,source:intent.source,destination:intent.destination,quantity:intent.quantity,attested:false,anchored:false,settled:false};
}
