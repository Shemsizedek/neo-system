import {handleRpc} from './rpc.js'
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type!=='NEOMASK_RPC')return false;
  const origin=message.origin||new URL(sender.url||sender.tab?.url||'https://invalid.local').origin;
  handleRpc({origin,method:message.method,params:message.params||[]}).then(result=>sendResponse({result})).catch(error=>sendResponse({error:{message:String(error?.message||error)}}));
  return true;
});
