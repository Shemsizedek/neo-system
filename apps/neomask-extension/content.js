const s=document.createElement('script');s.src=chrome.runtime.getURL('inpage.js');s.async=false;(document.documentElement||document.head).appendChild(s);s.remove();
window.addEventListener('message',async e=>{
  if(e.source!==window||e.data?.source!=='NEOMASK_PAGE')return;
  const origin=location.origin;
  try{
    const result=await chrome.runtime.sendMessage({type:'NEOMASK_RPC',origin,id:e.data.id,method:e.data.method,params:e.data.params});
    window.postMessage({source:'NEOMASK_EXTENSION',id:e.data.id,result:result?.result,error:result?.error},'*');
  }catch(error){window.postMessage({source:'NEOMASK_EXTENSION',id:e.data.id,error:{message:String(error?.message||error)}},'*')}
});
