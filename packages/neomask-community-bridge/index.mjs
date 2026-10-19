// NeoMask Community Bridge v1. No key material or broadcasting crosses this API.
const IDS=['freewallet','counterpay','neopay'];
const PSBT=/^70736274ff(?:[a-f0-9]{2})+$/i;
function checkAccount(a,ledger){
 if(!a||a.ledger!==ledger||a.network!=='mainnet'||a.watchOnly||a.signingAvailable!==true||!/^1[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a.address||''))throw Error('Select a signing Legacy mainnet account for this ledger.');
 return {address:a.address,network:a.network,ledger,signingAvailable:true};
}
function psbt(hex){if(typeof hex!=='string'||hex.length>2000000||!PSBT.test(hex))throw Error('Invalid PSBT.');return hex;}
export function createWalletHost({wallet,approve,ledgers}){
 if(typeof approve!=='function'||!Array.isArray(ledgers)||!ledgers.length||ledgers.some(l=>!['classic','cp20'].includes(l)))throw Error('Explicit approval and supported ledgers required.');
 const sessions=new Map();let busy=false;
 const read=async ledger=>checkAccount(await wallet.getAccount({ledger}),ledger);
 return async function request({origin,session,method,params={}}){
  if(!/^https:\/\//.test(origin)||new URL(origin).origin!==origin||!session||session.length>128)throw Error('Invalid caller.');
  if(busy)throw Error('Finish the current wallet request first.');busy=true;
  const key=origin+'|'+session;
  try{
   const ledger=params.ledger;
   if(!ledgers.includes(ledger))throw Error('Unsupported ledger.');
   if(method==='connect'){
    if(!await approve({origin,method,ledger}))throw Error('Connection declined.');
    await wallet.connect({ledger});const a=await read(ledger);sessions.set(key,{...a,expires:Date.now()+600000});return a;
   }
   const s=sessions.get(key);
   if(!s||s.expires<Date.now()||s.ledger!==ledger)throw Error('Connect your wallet again.');
   if(method==='disconnect'){sessions.delete(key);await wallet.disconnect({ledger});return null;}
   const a=await read(ledger);
   if(a.address!==s.address){sessions.delete(key);throw Error('Wallet account changed. Connect again.');}
   if(method==='getAccount')return a;
   if(method!=='signPsbt')throw Error('Unsupported method.');
   const hex=psbt(params.hex),inputs=params.options?.signInputs;
   if(!inputs||Object.keys(inputs).length!==1||!Array.isArray(inputs[a.address])||!inputs[a.address].length||!inputs[a.address].every(i=>Number.isSafeInteger(i)&&i>=0))throw Error('Explicit signing input indices required.');
   // The wallet approval UI must decode outputs, amounts and fees before approving.
   if(!await approve({origin,method,ledger,account:a,hex,signInputs:inputs}))throw Error('Signing declined.');
   const before=await read(ledger);if(before.address!==a.address)throw Error('Wallet account changed.');
   const signed=psbt(await wallet.signPsbt(hex,ledger,{signInputs:inputs,sighashTypes:[1]}));
   const after=await read(ledger);if(after.address!==a.address){sessions.delete(key);throw Error('Wallet account changed.');}return signed;
  }finally{busy=false;}
 };
}
export function registerWalletBridge(scope,{id,ledgers,request}){
 if(!IDS.includes(id)||typeof request!=='function'||!Array.isArray(ledgers)||!ledgers.length||ledgers.some(l=>!['classic','cp20'].includes(l)))throw Error('Invalid bridge configuration.');
 const session=scope.crypto.randomUUID(),listeners=new Map();
 const call=(method,params)=>request({origin:scope.location.origin,session,method,params});
 const adapter=Object.freeze({neoMaskAdapterVersion:1,ledgers:[...ledgers],
  connect:({ledger})=>call('connect',{ledger}),getAccount:({ledger})=>call('getAccount',{ledger}),
  signPsbt:(hex,ledger,options)=>call('signPsbt',{hex:psbt(hex),ledger,options}),
  async disconnect({ledger}){try{return await call('disconnect',{ledger});}finally{for(const fn of listeners.get('disconnect')||[])fn();}},
  on(event,fn){if(!listeners.has(event))listeners.set(event,new Set());listeners.get(event).add(fn);},
  removeListener(event,fn){listeners.get(event)?.delete(fn);}
 });
 scope.neoMaskWalletAdapters ||= Object.create(null);
 if(scope.neoMaskWalletAdapters[id])throw Error('Wallet bridge already registered.');
 scope.neoMaskWalletAdapters[id]=adapter;return adapter;
}
// Wallet-side companion for a dedicated HTTPS popup route. No wildcard targets.
export function servePopupBridge(scope,{merchantOrigin,request}){
 if(new URL(merchantOrigin).origin!==merchantOrigin||!merchantOrigin.startsWith('https://')||!scope.opener)throw Error('Invalid merchant origin.');
 const handler=async e=>{
  if(e.source!==scope.opener||e.origin!==merchantOrigin||e.data?.protocol!=='neomask-v1')return;
  const {id,payload}=e.data;if(typeof id!=='string'||id.length>128)return;
  if(payload?.method==='ping'){scope.opener.postMessage({protocol:'neomask-v1',id,result:true},merchantOrigin);return;}
  try{const result=await request({...payload,origin:e.origin});scope.opener.postMessage({protocol:'neomask-v1',id,result},merchantOrigin);}
  catch{scope.opener.postMessage({protocol:'neomask-v1',id,error:'Wallet request declined or unavailable.'},merchantOrigin);}
 };
 scope.addEventListener('message',handler);return()=>scope.removeEventListener('message',handler);
}
export function popupTransport(scope,{url,timeout=120000}){
 const target=new URL(url);if(target.protocol!=='https:')throw Error('Wallet endpoint must use HTTPS.');
 let popup=null;const pending=new Map();
 const receive=e=>{if(e.origin!==target.origin||e.source!==popup||e.data?.protocol!=='neomask-v1')return;const p=pending.get(e.data.id);if(p){pending.delete(e.data.id);clearTimeout(p.timer);e.data.error?p.reject(Error(e.data.error)):p.resolve(e.data.result);}};
 scope.addEventListener('message',receive);
 function send(payload,limit=timeout){return new Promise((resolve,reject)=>{const id=scope.crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(id);reject(Error('Wallet request timed out.'));},limit);pending.set(id,{resolve,reject,timer});popup.postMessage({protocol:'neomask-v1',id,payload},target.origin);});}
 return {async request(payload){
  if(!popup||popup.closed){if(payload.method!=='connect')throw Error('Connect the wallet again.');popup=scope.open(target.href,'_blank','popup,width=440,height=720');if(!popup)throw Error('Allow the wallet popup.');
   const deadline=Date.now()+15000;let ready=false;while(Date.now()<deadline&&!popup.closed){try{await send({method:'ping'},500);ready=true;break;}catch{}}if(!ready)throw Error('Wallet bridge did not respond.');
  }return send(payload);
 },dispose(){scope.removeEventListener('message',receive);for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('Bridge closed.'));}pending.clear();popup?.close();}};
}
