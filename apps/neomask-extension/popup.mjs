const id=new URLSearchParams(location.search).get('request');
const status=document.querySelector('#status');
async function send(message){const r=await chrome.runtime.sendMessage(message);if(r.error)throw new Error(r.error);return r.result;}
if(id){
 try{const p=await send({kind:'pending',id});document.querySelector('#request').textContent='Site: '+p.origin+' · Ledger: '+p.ledger;document.querySelector('#approval').hidden=false;}
 catch(e){status.textContent=e.message;}
}
document.querySelector('#approval').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;
 try{await send({kind:'decide',id,approve:true,address:document.querySelector('#address').value.trim()});status.textContent='Watch-only account connected.';document.querySelector('#approval').hidden=true;}
 catch(e){status.textContent=e.message;}finally{button.disabled=false;}
});
document.querySelector('#reject').addEventListener('click',async()=>{try{await send({kind:'decide',id,approve:false});window.close();}catch(e){status.textContent=e.message;}});
document.querySelector('#revoke').addEventListener('click',async()=>{try{await send({kind:'revoke'});status.textContent='All site permissions revoked.';}catch(e){status.textContent=e.message;}});
