import {randomUUID} from 'node:crypto';

// BTC-only inbound payment requests for NEO Sales and Temple outreach.
// No secrets, wallet custody, auto-spending, signing, or broadcasting.
const LIMIT=2100000000000000n;
const ADDRESS=/^(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1(?:q[023456789acdefghjklmnpqrstuvwxyz]{38,87}|p[023456789acdefghjklmnpqrstuvwxyz]{58}))$/;
const REF=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{2,79}$/;
const KEY=/^[a-zA-Z0-9][a-zA-Z0-9_-]{15,95}$/;
const HASH=/^[0-9a-f]{64}$/;
const NETWORK='bitcoin-mainnet';
const clone=structuredClone;
const fields=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(key=>keys.includes(key));
const amount=value=>{
  if(value===null||value===undefined)return null;
  if(!Number.isSafeInteger(value)||value<1000||BigInt(value)>LIMIT)throw Error('invalid_amount_sats');
  return value;
};
export function btcAmountString(value){
  if(value===null)return null;
  const n=BigInt(value);
  return (String(n/100000000n)+'.'+String(n%100000000n).padStart(8,'0')).replace(/0+$/,'').replace(/\.$/,'');
}
function bip21(address,sats,channel){
  const params=new URLSearchParams();
  if(sats!==null)params.set('amount',btcAmountString(sats));
  params.set('label',channel==='TEMPLE'?'NEO Temple donation':'NEO Sales payment');
  return 'bitcoin:'+address+'?'+params.toString().replace(/\+/g,'%20');
}

/** Operator must populate bindings only after independently proving wallet control.
 * All addresses must belong to the named organization, and each payment request
 * reserves a different receiving address. This in-memory service is staging-only.
 */
export function createOutreachRequestService({walletBindings=[],now=()=>new Date(),uuid=randomUUID,minimumConfirmations=3,verifyInclusion=null}={}){
  if(!Array.isArray(walletBindings)||!Number.isInteger(minimumConfirmations)||minimumConfirmations<1)throw TypeError('invalid_outreach_service_config');
  const bindings=new Map();
  for(const row of walletBindings){
    if(!fields(row,['bindingId','address','network','status','controller','controlProofRef'])||
      !REF.test(row.bindingId??'')||!ADDRESS.test(row.address??'')||
      row.network!==NETWORK||row.status!=='VERIFIED'||row.controller!=='NEO_ORGANIZATION'||
      !REF.test(row.controlProofRef??'')||bindings.has(row.bindingId))
      throw TypeError('verified_organization_wallet_binding_required');
    bindings.set(row.bindingId,Object.freeze({...row}));
  }
  const requests=new Map(),dedupe=new Map(),reserved=new Set();
  function prepare(input){
    if(!fields(input,['channel','campaignRef','leadRef','orderRef','walletBindingId','amountSats','idempotencyKey','expiresHours'])||
      !['TEMPLE','SALES'].includes(input.channel)||!REF.test(input.campaignRef??'')||
      (input.leadRef!==undefined&&!REF.test(input.leadRef))||
      !REF.test(input.walletBindingId??'')||!KEY.test(input.idempotencyKey??''))
      throw Error('invalid_outreach_request');
    const sale=input.channel==='SALES';
    if(sale!==Boolean(input.orderRef)||(sale&&!REF.test(input.orderRef)))throw Error('sales_order_reference_required');
    const sats=amount(input.amountSats);
    if(sale&&sats===null)throw Error('fixed_sale_amount_required');
    const hours=input.expiresHours??72;
    if(!Number.isSafeInteger(hours)||hours<1||hours>720)throw Error('invalid_expiration');
    const binding=bindings.get(input.walletBindingId);
    if(!binding)throw Error('verified_receiving_wallet_not_available');
    const fingerprint=JSON.stringify({channel:input.channel,campaignRef:input.campaignRef,leadRef:input.leadRef??null,orderRef:input.orderRef??null,walletBindingId:input.walletBindingId,amountSats:sats,expiresHours:hours});
    const existing=dedupe.get(input.idempotencyKey);
    if(existing){
      if(existing.fingerprint!==fingerprint)throw Error('idempotency_key_conflict');
      return clone(requests.get(existing.id));
    }
    if(reserved.has(binding.address))throw Error('receiving_address_already_reserved');
    const created=now();
    if(!(created instanceof Date)||!Number.isFinite(created.valueOf()))throw Error('invalid_clock');
    const id=uuid();
    const request={
      requestId:id,channel:input.channel,purpose:sale?'SALE':'DONATION',
      campaignRef:input.campaignRef,leadRef:input.leadRef??null,orderRef:input.orderRef??null,
      walletBindingId:binding.bindingId,receivingAddress:binding.address,network:NETWORK,
      amountSats:sats,amountBtc:btcAmountString(sats),qrPayload:bip21(binding.address,sats,input.channel),
      status:'AWAITING_PAYMENT',createdAt:created.toISOString(),
      expiresAt:new Date(created.valueOf()+hours*3600000).toISOString(),
      confirmationPolicy:minimumConfirmations,observedTransaction:null,
      controls:{signing:false,broadcast:false,custody:false,tokenIssuance:false,autoSend:false}
    };
    requests.set(id,request);dedupe.set(input.idempotencyKey,{fingerprint,id});reserved.add(binding.address);
    return clone(request);
  }
  function get(id){return requests.has(id)?clone(requests.get(id)):null;}
  /** Evidence is fetched from a trusted server-side verifier, never client JSON. */
  async function observe(id,txid){
    const request=requests.get(id);
    if(!request)throw Error('request_not_found');
    if(typeof verifyInclusion!=='function')throw Error('trusted_verifier_required');
    if(!HASH.test(txid??''))throw Error('invalid_txid');
    const proof=await verifyInclusion({txid,requestId:id,address:request.receivingAddress,network:NETWORK});
    if(!fields(proof,['txid','blockHash','network','recipientAddress','receivedSats','confirmations','inclusionVerified','uniqueOutputMatch'])||
      !HASH.test(proof.txid??'')||proof.txid!==txid||!HASH.test(proof.blockHash??'')||
      proof.network!==NETWORK||proof.recipientAddress!==request.receivingAddress||
      !Number.isSafeInteger(proof.receivedSats)||proof.receivedSats<1||
      !Number.isSafeInteger(proof.confirmations)||proof.confirmations<0||
      proof.inclusionVerified!==true||proof.uniqueOutputMatch!==true)throw Error('unverified_bitcoin_payment');
    if(request.amountSats!==null&&proof.receivedSats!==request.amountSats)throw Error('payment_amount_mismatch');
    if(request.observedTransaction&&request.observedTransaction.txid!==txid)throw Error('transaction_conflict');
    request.observedTransaction={txid,blockHash:proof.blockHash,receivedSats:proof.receivedSats,confirmations:proof.confirmations};
    request.status=proof.confirmations>=minimumConfirmations?'SETTLED_VERIFIED':'AWAITING_CONFIRMATIONS';
    return clone(request);
  }
  function expire(id){
    const request=requests.get(id);
    if(!request)return null;
    if(request.status==='AWAITING_PAYMENT'&&Date.parse(request.expiresAt)<now().valueOf())request.status='EXPIRED';
    return clone(request);
  }
  return Object.freeze({prepare,get,observe,expire,bindingsCount:()=>bindings.size});
}

/** Public view intentionally omits all private prospect, campaign, and order references. */
export function renderOutreachCheckout(request){
  if(!request||!['TEMPLE','SALES'].includes(request.channel)||!ADDRESS.test(request.receivingAddress??''))throw Error('invalid_checkout_request');
  const title=request.channel==='TEMPLE'?'NEO Temple Bitcoin donation':'NEO Sales Bitcoin checkout';
  const amount=request.amountBtc===null?'Choose an amount in your wallet':request.amountBtc+' BTC';
  const uri=bip21(request.receivingAddress,request.amountSats,request.channel).replace(/&/g,'&amp;');
  const expiry=String(request.expiresAt||'').replace(/[^0-9TZ:.-]/g,'');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{margin:0;padding:24px;background:#071b12;color:#f2fff5;font:16px/1.5 system-ui,sans-serif}main{max-width:600px;margin:5vh auto;padding:25px;border:1px solid #4b986b;border-radius:18px}code{display:block;overflow-wrap:anywhere;padding:12px;background:#123021;border-radius:10px}a{display:inline-block;background:#c6f7d6;color:#072211;border-radius:10px;padding:13px 17px;font-weight:700;text-decoration:none}small{display:block;margin-top:15px;color:#b2d6be}</style></head><body><main><h1>'+title+'</h1><p>Amount: <strong>'+amount+'</strong></p><p>Verified organization receiving address:</p><code>'+request.receivingAddress+'</code><p><a href="'+uri+'">Open Bitcoin wallet</a></p><small>Bitcoin mainnet only. Payment is not confirmed until independently verified. Expires: '+expiry+'. Never share a recovery phrase.</small></main></body></html>';
}
