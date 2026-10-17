(() => {
if(window.__neoMaskBridgeReady)return;window.__neoMaskBridgeReady=true;
window.addEventListener('message',async event=>{
 if(event.source!==window || event.origin!==location.origin || event.data?.channel!=='neomask:request')return;
 const {id,method,params}=event.data;
 if(typeof id!=='string'||id.length>80||!['connect','getAccount','disconnect','getCapabilities','signPsbt','composeBond'].includes(method))return;
 try{
  const result=await chrome.runtime.sendMessage({kind:'page',method,params});
  window.postMessage({channel:'neomask:response',id,...result},location.origin);
 }catch{window.postMessage({channel:'neomask:response',id,error:'NeoMask extension unavailable; reload the page'},location.origin);}
});

})();
