import {handleRpc} from './rpc.js'
import {trustedSenderOrigin} from './origin-policy.mjs'
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=='NEOMASK_RPC')return false;
  let origin;try{origin=trustedSenderOrigin(sender,message,chrome.runtime.id);}catch{sendResponse({error:{message:'Untrusted NeoMask request origin'}});return false;}
  handleRpc({origin,method:message.method,params:message.params||[]}).then(result=>sendResponse({result})).catch(error=>sendResponse({error:{message:String(error?.message||error)}}));
  return true;
});
