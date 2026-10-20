import {pageOrigin} from './site-access.mjs';
import {validLedger,permissionKey,readAccount} from '../policy.mjs';
import {buildBondPsbt} from './counterparty.mjs';
import {sealWif,openVault,createKey,reviewPsbt,psbtDigest,signReviewedPsbt} from './wallet.mjs';
const pending=new Map();let vaultRevision=0;
chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
const vault=async()=>{const v=(await chrome.storage.local.get('vault')).vault;if(!v)throw new Error('Import or create your wallet inside NeoMask first');return v;};
const removeGrants=async()=>{const all=await chrome.storage.local.get(null);await chrome.storage.local.remove(Object.keys(all).filter(k=>k.startsWith('grant:')));};
function expire(id){const p=pending.get(id);if(!p)return;pending.delete(id);clearTimeout(p.timer);p.reply({error:'Request cancelled or expired'});if(p.windowId)chrome.windows.remove(p.windowId).catch(()=>{});}
async function prompt(request){if(pending.size>=4)throw new Error('Too many pending approvals');for(const p of pending.values())if(p.origin===request.origin)throw new Error('A request is already pending for this site');const id=crypto.randomUUID();const p={...request,expiresAt:Date.now()+120000,timer:setTimeout(()=>expire(id),120000)};pending.set(id,p);try{const win=await chrome.windows.create({url:chrome.runtime.getURL('popup.html')+'?request='+id,type:'popup',width:470,height:680});p.windowId=win.id;}catch{expire(id);}}
chrome.windows.onRemoved.addListener(windowId=>{for(const [id,p] of pending)if(p.windowId===windowId)expire(id);});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 (async()=>{
  if(message.kind==='page'){
   const origin=await pageOrigin(chrome,sender),method=message.method;
   if(method==='getCapabilities'){reply({result:{name:'NeoMask',network:'mainnet',ledgers:['classic','cp20'],signPsbt:true,signRawTransaction:false,counterpartySigning:true}});return;}
   const ledger=validLedger(message.params?.ledger),key=permissionKey(origin,ledger);
   if(method==='disconnect'){await chrome.storage.local.remove(key);for(const[id,p]of pending)if(p.origin===origin&&p.ledger===ledger)expire(id);reply({result:{disconnected:true}});return;}
   if(method==='getAccount'){const account=readAccount((await chrome.storage.local.get(key))[key]);const v=await vault();if(account.address!==v.address)throw new Error('Wallet changed; reconnect');reply({result:{...account,watchOnly:false,signingAvailable:true,psbt:true,counterpartySigning:true}});return;}
   const v=await vault();
   if(method==='connect'){await prompt({type:'connect',origin,ledger,reply,address:v.address,vaultRevision,sender});return;}
   if(method==='composeBond'){
    const grant=readAccount((await chrome.storage.local.get(key))[key]);
    if(grant.address!==v.address)throw new Error('Wallet changed; reconnect');
    const o=message.params;
    reply({result:{psbtHex:buildBondPsbt({asset:o.asset,quantityAtomic:o.quantityAtomic,destination:o.destination,feeSats:o.feeSats,inputs:o.inputs,ledger,source:v.address}),broadcast:false}});return;
   }
   if(method==='signPsbt'){
    const grant=readAccount((await chrome.storage.local.get(key))[key]);
    if(grant.address!==v.address)throw new Error('Wallet changed; reconnect');
    const hex=message.params.hex;
    const summary=reviewPsbt(hex,v.address,ledger),digest=await psbtDigest(hex);
    await prompt({type:'sign',origin,ledger,key,reply,address:v.address,hex,digest,summary,vaultRevision,sender});return;
   }
   throw new Error('Unsupported method');
  }
  const ui=sender.url?.split('?')[0];
  if(sender.id!==chrome.runtime.id||![chrome.runtime.getURL('popup.html'),chrome.runtime.getURL('vault.html')].includes(ui))throw new Error('Extension UI required');
  if(message.kind==='vaultStatus'){const v=(await chrome.storage.local.get('vault')).vault;reply({result:{address:v?.address||null}});return;}
  if(message.kind==='createKey'){if(ui!==chrome.runtime.getURL('vault.html'))throw new Error('Vault UI required');reply({result:createKey()});return;}
  if(message.kind==='saveVault'){
   if(ui!==chrome.runtime.getURL('vault.html'))throw new Error('Vault UI required');
   if((await chrome.storage.local.get('vault')).vault)throw new Error('A vault already exists; it will not be overwritten');
   const next=await sealWif(message.wif,message.password);
   if((await chrome.storage.local.get('vault')).vault)throw new Error('A vault already exists');
   await chrome.storage.local.set({vault:next});vaultRevision++;await removeGrants();
   reply({result:{address:next.address}});return;
  }
  if(message.kind==='pending'){const p=pending.get(message.id);if(!p||p.expiresAt<=Date.now())throw new Error('Request expired');reply({result:{origin:p.origin,ledger:p.ledger,type:p.type,address:p.address,summary:p.summary,digest:p.digest}});return;}
  if(message.kind==='decide'){
   const p=pending.get(message.id);if(!p||p.expiresAt<=Date.now())throw new Error('Request expired');
   if(!message.approve){expire(message.id);reply({result:{closed:true}});return;}
   if(p.processing)throw new Error('Approval is already processing');p.processing=true;
   try{
    await pageOrigin(chrome,p.sender);
    if(p.vaultRevision!==vaultRevision)throw new Error('Wallet changed');
    if(p.type==='connect'){
     const v=await vault();if(v.address!==p.address)throw new Error('Wallet changed');
     if(pending.get(message.id)!==p||p.expiresAt<=Date.now())throw new Error('Request expired');
     const grant={address:v.address,origin:p.origin,ledger:p.ledger,expiresAt:Date.now()+600000};
     await chrome.storage.local.set({[permissionKey(p.origin,p.ledger)]:grant});
     if(pending.get(message.id)!==p){await chrome.storage.local.remove(permissionKey(p.origin,p.ledger));throw new Error('Connection cancelled');}
     pending.delete(message.id);clearTimeout(p.timer);
     p.reply({result:{...readAccount(grant),watchOnly:false,signingAvailable:true,psbt:true,counterpartySigning:true}});
    }else{
     const v=await vault(),wif=await openVault(v,message.password);
     const grant=readAccount((await chrome.storage.local.get(p.key))[p.key]);
     if(grant.address!==p.address||p.vaultRevision!==vaultRevision)throw new Error('Account changed');
     const signed=await signReviewedPsbt({hex:p.hex,wif,approvedDigest:p.digest,ledger:p.ledger});
     readAccount((await chrome.storage.local.get(p.key))[p.key]);
     await pageOrigin(chrome,p.sender);
     if(pending.get(message.id)!==p||p.expiresAt<=Date.now()||p.vaultRevision!==vaultRevision)throw new Error('Approval expired or revoked');
     pending.delete(message.id);clearTimeout(p.timer);p.reply({result:signed});
    }
    reply({result:{approved:true}});
   }catch(e){p.processing=false;throw e;}
   return;
  }
  if(message.kind==='revoke'){vaultRevision++;for(const id of [...pending.keys()])expire(id);await removeGrants();reply({result:{revoked:true}});return;}
  throw new Error('Unsupported request');
 })().catch(error=>reply({error:error.message}));
 return true;
});
