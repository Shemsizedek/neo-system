import {createHmac,timingSafeEqual} from 'node:crypto';
// NEOB-021: service authentication for server-to-server Teller requests.
// Callers must validate a strict JSON body; never use this for customer login.
export function authenticateTellerService({method,path,body='',timestamp,nonce,signature},{secret,now=Date.now}={}){
 if(typeof secret!=='string'||secret.length<32)throw new Error('teller_service_unconfigured');
 if(method!=='POST'||path!=='/api/v1/bank/teller/assertions/consume')throw new Error('teller_service_forbidden');
 if(typeof body!=='string'||body.length>8192||!/^[a-f0-9-]{36}$/.test(nonce||'')||!Number.isSafeInteger(timestamp)||Math.abs(now()-timestamp)>60000)throw new Error('teller_service_invalid');
 const canonical=[method,path,timestamp,nonce,body].join('\n');
 const expected=createHmac('sha256',secret).update(canonical).digest();
 let candidate;try{candidate=Buffer.from(signature||'','hex')}catch{throw new Error('teller_service_invalid')}
 if(candidate.length!==expected.length||!timingSafeEqual(candidate,expected))throw new Error('teller_service_invalid');
 return {authorized:true,nonce};
}
export function validateCrownReceipt({digest,txid,network,confirmed=false}={}){
 if(!/^sha256:[a-f0-9]{64}$/.test(digest||'')||!['bitcoin-mainnet','counterparty-mainnet'].includes(network)||! /^[a-f0-9]{64}$/.test(txid||''))throw new Error('invalid_crown_receipt');
 return {digest,txid,network,verified:false,confirmed:false,reason:'independent_anchor_check_required'};
}
