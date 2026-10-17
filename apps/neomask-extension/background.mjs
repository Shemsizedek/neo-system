import {trustedOrigin,validLedger,validAddress,permissionKey,readAccount} from './policy.mjs';
const pending=new Map();
chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
const expire = id => {
 const request=pending.get(id);if(!request)return;
 pending.delete(id);clearTimeout(request.timer);
 request.reply({error:'Connection cancelled or expired'});
 if(request.windowId)chrome.windows.remove(request.windowId).catch(()=>{});
};
chrome.windows.onRemoved.addListener(windowId=>{
 for(const [id,p] of pending)if(p.windowId===windowId)expire(id);
});
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 (async()=>{
  if(message.kind==='page'){
   const origin=trustedOrigin(sender);
   if(message.method==='getCapabilities'){reply({result:{name:'NeoMask',network:'mainnet',ledgers:['classic','cp20'],watchOnly:true,signRawTransaction:false,signPsbt:false}});return;}
   const ledger=validLedger(message.params?.ledger);
   const key=permissionKey(origin,ledger);
   if(message.method==='disconnect'){await chrome.storage.local.remove(key);reply({result:{disconnected:true}});return;}
   if(message.method==='getAccount'){const grant=(await chrome.storage.local.get(key))[key];reply({result:readAccount(grant)});return;}
   if(message.method!=='connect')throw new Error('Unsupported method');
   for(const p of pending.values())if(p.origin===origin)throw new Error('A connection approval is already open');
   if(pending.size>=4)throw new Error('Too many pending approvals');
   const id=crypto.randomUUID();
   const p={origin,ledger,reply,expiresAt:Date.now()+120000,timer:setTimeout(()=>expire(id),120000)};
   pending.set(id,p);
   try{const win=await chrome.windows.create({url:chrome.runtime.getURL('popup.html')+'?request='+id,type:'popup',width:430,height:600});p.windowId=win.id;}
   catch(e){expire(id);}
   return;
  }
  // Only extension-owned UI may inspect/approve permission requests.
  if(sender.id !== chrome.runtime.id || !sender.url || sender.url.split('?')[0] !== chrome.runtime.getURL('popup.html'))throw new Error('Extension UI required');
  if(message.kind==='pending'){
   const p=pending.get(message.id);if(!p||p.expiresAt<=Date.now())throw new Error('Request expired');
   reply({result:{origin:p.origin,ledger:p.ledger}});return;
  }
  if(message.kind==='decide'){
   const p=pending.get(message.id);if(!p||p.expiresAt<=Date.now())throw new Error('Request expired');
   if(!message.approve){expire(message.id);reply({result:{closed:true}});return;}
   if(!await validAddress(message.address))throw new Error('Enter a valid legacy Bitcoin address with a valid checksum');
   const grant={address:message.address,origin:p.origin,ledger:p.ledger,expiresAt:Date.now()+600000};
   await chrome.storage.local.set({[permissionKey(p.origin,p.ledger)]:grant});
   pending.delete(message.id);clearTimeout(p.timer);p.reply({result:readAccount(grant)});
   reply({result:{approved:true}});return;
  }
  if(message.kind==='revoke'){for(const id of [...pending.keys()])expire(id);const all=await chrome.storage.local.get(null);await chrome.storage.local.remove(Object.keys(all).filter(k=>k.startsWith('grant:')));reply({result:{revoked:true}});return;}
  throw new Error('Unsupported request');
 })().catch(error=>reply({error:error.message}));
 return true;
});
