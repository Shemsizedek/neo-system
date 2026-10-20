(() => {
 if(window.neoMask)return;
 const request=({method,params={}})=>{
  if(!['connect','getAccount','disconnect','getCapabilities','signPsbt','composeBond'].includes(method))
   return Promise.reject(new Error('NeoMask signing is not enabled in this build'));
  const id=crypto.randomUUID();
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{window.removeEventListener('message',receive);reject(new Error('NeoMask request expired'));},125000);
   function receive(event){
    if(event.source!==window || event.origin!==location.origin || event.data?.channel!=='neomask:response' || event.data.id!==id)return;
    clearTimeout(timer);window.removeEventListener('message',receive);
    event.data.error?reject(new Error(event.data.error)):resolve(event.data.result);
   }
   window.addEventListener('message',receive);
   window.postMessage({channel:'neomask:request',id,method,params},location.origin);
  });
 };
 Object.defineProperty(window,'neoMask',{value:Object.freeze({name:'NeoMask',isNeoMask:true,request,
  connect:params=>request({method:'connect',params}),getAccount:params=>request({method:'getAccount',params}),
  disconnect:params=>request({method:'disconnect',params}),signPsbt:(hex,ledger)=>request({method:'signPsbt',params:{hex,ledger}}),composeBond:(options,ledger)=>request({method:'composeBond',params:{...options,ledger}})}),writable:false,configurable:false});
 window.dispatchEvent(new Event('neomask:initialized'));
})();

